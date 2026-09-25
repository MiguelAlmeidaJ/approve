import {
  connect as connectNet,
  type Socket
} from "node:net";
import {
  connect as connectTls,
  type TLSSocket
} from "node:tls";

type SmtpSocket = Socket | TLSSocket;

type SmtpResponse = {
  code: number;
  text: string;
};

class SmtpReader {
  private buffer = "";
  private responseCode: string | null = null;
  private responseLines: string[] = [];
  private queue: SmtpResponse[] = [];
  private waiters: Array<{
    resolve: (value: SmtpResponse) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private readonly onData = (chunk: Buffer) => {
    this.buffer += chunk.toString("utf8");
    let index = this.buffer.indexOf("\r\n");

    while (index >= 0) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      this.consumeLine(line);
      index = this.buffer.indexOf("\r\n");
    }
  };

  private readonly onError = (error: Error) => {
    while (this.waiters.length > 0) {
      this.waiters.shift()?.reject(error);
    }
  };

  private readonly onClose = () => {
    if (this.waiters.length > 0) {
      this.onError(new Error("Conexão SMTP encerrada antes da resposta."));
    }
  };

  constructor(private readonly socket: SmtpSocket) {
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("close", this.onClose);
  }

  detach() {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
  }

  read(): Promise<SmtpResponse> {
    const queued = this.queue.shift();

    if (queued) {
      return Promise.resolve(queued);
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  private consumeLine(line: string) {
    const match = /^(\d{3})([ -])(.*)$/.exec(line);

    if (!match) {
      this.responseLines.push(line);
      return;
    }

    if (!this.responseCode) {
      this.responseCode = match[1];
    }

    this.responseLines.push(line);

    if (match[1] === this.responseCode && match[2] === " ") {
      const response = {
        code: Number(this.responseCode),
        text: this.responseLines.join("\n")
      };

      this.responseCode = null;
      this.responseLines = [];

      const waiter = this.waiters.shift();

      if (waiter) {
        waiter.resolve(response);
      } else {
        this.queue.push(response);
      }
    }
  }
}

function waitForConnect(socket: SmtpSocket, secure: boolean) {
  return new Promise<void>((resolve, reject) => {
    const event = secure ? "secureConnect" : "connect";
    socket.once(event, () => resolve());
    socket.once("error", reject);
  });
}

function assertResponse(response: SmtpResponse, ...codes: number[]) {
  if (!codes.includes(response.code)) {
    throw new Error(`SMTP respondeu ${response.code}: ${response.text}`);
  }
}

async function command(
  socket: SmtpSocket,
  reader: SmtpReader,
  value: string,
  ...codes: number[]
) {
  socket.write(`${value}\r\n`);
  const response = await reader.read();
  assertResponse(response, ...codes);
  return response;
}

function extractAddress(value: string) {
  const bracket = /<([^>]+)>/.exec(value);
  return (bracket?.[1] ?? value).trim();
}

function dotStuff(value: string) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

export async function sendTextEmail(input: {
  to: string;
  subject: string;
  body: string;
}) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465;
  const useStartTls =
    !secure &&
    process.env.SMTP_STARTTLS?.trim().toLowerCase() !== "false";
  const rejectUnauthorized =
    process.env.SMTP_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false";
  const username = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD ?? "";
  const from =
    process.env.SMTP_FROM?.trim() ||
    (username ? `Terceiro Andar Aprovação <${username}>` : "");
  const fromAddress = extractAddress(from);

  if (!host || !fromAddress) {
    throw new Error(
      "SMTP_HOST e SMTP_FROM (ou SMTP_USER) precisam estar configurados."
    );
  }

  let socket: SmtpSocket = secure
    ? connectTls({
        host,
        port,
        servername: host,
        rejectUnauthorized
      })
    : connectNet({ host, port });

  socket.setTimeout(15000, () => {
    socket.destroy(new Error("Tempo limite excedido ao conectar ao SMTP."));
  });

  await waitForConnect(socket, secure);
  let reader = new SmtpReader(socket);
  assertResponse(await reader.read(), 220);

  let ehlo = await command(
    socket,
    reader,
    `EHLO ${process.env.SMTP_HELO?.trim() || "approve.terceiroandar.local"}`,
    250
  );

  if (useStartTls) {
    await command(socket, reader, "STARTTLS", 220);
    reader.detach();

    socket = connectTls({
      socket: socket as Socket,
      servername: host,
      rejectUnauthorized
    });

    socket.setTimeout(15000, () => {
      socket.destroy(new Error("Tempo limite excedido na conexão SMTP segura."));
    });

    await waitForConnect(socket, true);
    reader = new SmtpReader(socket);
    ehlo = await command(
      socket,
      reader,
      `EHLO ${process.env.SMTP_HELO?.trim() || "approve.terceiroandar.local"}`,
      250
    );
  }

  if (username) {
    if (/AUTH[^\n]*\bPLAIN\b/i.test(ehlo.text)) {
      const token = Buffer.from(
        `\u0000${username}\u0000${password}`,
        "utf8"
      ).toString("base64");

      await command(socket, reader, `AUTH PLAIN ${token}`, 235);
    } else {
      await command(socket, reader, "AUTH LOGIN", 334);
      await command(
        socket,
        reader,
        Buffer.from(username, "utf8").toString("base64"),
        334
      );
      await command(
        socket,
        reader,
        Buffer.from(password, "utf8").toString("base64"),
        235
      );
    }
  }

  await command(socket, reader, `MAIL FROM:<${fromAddress}>`, 250);
  await command(socket, reader, `RCPT TO:<${input.to}>`, 250, 251);
  await command(socket, reader, "DATA", 354);

  const message = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.body),
    "."
  ].join("\r\n");

  socket.write(`${message}\r\n`);
  assertResponse(await reader.read(), 250);

  socket.write("QUIT\r\n");
  socket.end();
}


export async function sendTemporaryPasswordEmail(input: {
  to: string;
  name: string;
  temporaryPassword: string;
}) {
  const loginUrl = `${(process.env.APP_URL ?? "http://localhost:4334").replace(/\/$/, "")}/login`;
  const body = [
    `Olá, ${input.name}.`,
    "",
    "Foi solicitada uma recuperação de senha para o sistema de aprovação da Terceiro Andar.",
    "",
    `Senha temporária: ${input.temporaryPassword}`,
    "",
    `Acesse: ${loginUrl}`,
    "",
    "Ao entrar com essa senha, o sistema solicitará a criação de uma nova senha forte.",
    "Se você não solicitou esta recuperação, entre em contato com a equipe responsável."
  ].join("\n");

  return sendTextEmail({
    to: input.to,
    subject: "Nova senha temporaria - Terceiro Andar",
    body
  });
}

export async function sendWorkflowEmail(input: {
  to?: string | null;
  subject: string;
  lines: string[];
}) {
  const to = input.to?.trim();

  if (!to || !process.env.SMTP_HOST?.trim()) {
    return false;
  }

  try {
    await sendTextEmail({
      to,
      subject: input.subject,
      body: input.lines.join("\n")
    });
    return true;
  } catch (error) {
    console.error("[mail] Falha ao enviar notificação de workflow.", error);
    return false;
  }
}
