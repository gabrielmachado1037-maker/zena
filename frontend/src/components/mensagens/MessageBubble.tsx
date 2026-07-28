import type { Mensagem } from "../../lib/mensagens";
import Avatar from "./Avatar";

// Renderiza o anexo do balão: player de áudio ou imagem.
function AnexoMsg({ url, tipo, temTexto }: { url: string; tipo?: string | null; temTexto: boolean }) {
  if (tipo === "audio") {
    return <audio controls src={url} className={`w-full max-w-[260px] ${temTexto ? "mb-2" : ""}`} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt="Anexo" className={`rounded-lg max-h-64 w-auto object-cover ${temTexto ? "mb-2" : ""}`} />
    </a>
  );
}

// Balão de mensagem — variante paciente (grafite, radius 16/16/16/4)
// e nutri (verde Nexvel, radius 16/16/4/16).
export default function MessageBubble({ msg }: { msg: Mensagem }) {
  if (msg.autor === "nutri") {
    return (
      <div className="flex gap-4 max-w-[80%] self-end flex-row-reverse">
        <Avatar url={msg.avatarUrl} nome="Nutri" className="w-8 h-8 rounded-full mt-auto flex-shrink-0" />
        <div className="flex flex-col gap-1 items-end">
          <span className="text-label-sm text-nx-on-surface-variant mr-1">{msg.hora}</span>
          <div className="chat-bubble-nutri p-4 shadow-md">
            {msg.anexoUrl && <AnexoMsg url={msg.anexoUrl} tipo={msg.anexoTipo} temTexto={!!msg.texto} />}
            {msg.texto && <p className="text-body-md text-nx-on-evo">{msg.texto}</p>}
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
          {msg.anexoUrl && <AnexoMsg url={msg.anexoUrl} tipo={msg.anexoTipo} temTexto={!!msg.texto} />}
          {msg.texto && <p className="text-body-md text-nx-on-surface">{msg.texto}</p>}
        </div>
      </div>
    </div>
  );
}
