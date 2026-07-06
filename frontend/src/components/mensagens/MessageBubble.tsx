import type { Mensagem } from "../../lib/mensagens";
import Avatar from "./Avatar";

// Balão de mensagem — variante paciente (cinza, radius 16/16/16/4)
// e nutri (gradiente roxo, radius 16/16/4/16). Fiel ao code.html.
export default function MessageBubble({ msg }: { msg: Mensagem }) {
  if (msg.autor === "nutri") {
    return (
      <div className="flex gap-4 max-w-[80%] self-end flex-row-reverse">
        <Avatar url={msg.avatarUrl} nome="Nutri" className="w-8 h-8 rounded-full mt-auto flex-shrink-0" />
        <div className="flex flex-col gap-1 items-end">
          <span className="text-label-sm text-nx-on-surface-variant mr-1">{msg.hora}</span>
          <div className="chat-bubble-nutri p-4 shadow-md">
            {msg.anexoUrl && (
              <a href={msg.anexoUrl} target="_blank" rel="noreferrer" className="block">
                <img src={msg.anexoUrl} alt="Anexo" className={`rounded-lg max-h-64 w-auto object-cover ${msg.texto ? "mb-2" : ""}`} />
              </a>
            )}
            {msg.texto && <p className="text-body-md text-nx-on-primary-container">{msg.texto}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 max-w-[80%]">
      <Avatar url={msg.avatarUrl} nome={msg.nome ?? "P"} className="w-8 h-8 rounded-full mt-auto flex-shrink-0" />
      <div className="flex flex-col gap-1">
        <span className="text-label-sm text-nx-on-surface-variant ml-1">
          {msg.nome ? `${msg.nome} • ${msg.hora}` : msg.hora}
        </span>
        <div className="chat-bubble-patient p-4 shadow-sm">
          {msg.anexoUrl && (
            <a href={msg.anexoUrl} target="_blank" rel="noreferrer" className="block">
              <img src={msg.anexoUrl} alt="Anexo" className={`rounded-lg max-h-64 w-auto object-cover ${msg.texto ? "mb-2" : ""}`} />
            </a>
          )}
          {msg.texto && <p className="text-body-md text-nx-on-surface">{msg.texto}</p>}
        </div>
      </div>
    </div>
  );
}
