import { useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import apiPaciente from "../../lib/apiPaciente";
import Avatar from "../../components/Avatar";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";
import { PrimaryButton, OutlineButton, TextButton } from "../onboarding/components/OnbButtons";

/**
 * Etapa de conclusão de perfil (foto) logo após o cadastro do paciente.
 * NÃO altera o fluxo de autenticação: o paciente já chega aqui autenticado
 * (token presente). Reaproveita o Avatar (fallback de iniciais), o endpoint
 * existente PUT /paciente-app/foto-perfil e os botões da marca (onboarding).
 * Recorte "circular" simples: corte quadrado central via canvas + preview redondo
 * (o Avatar já renderiza a imagem em círculo). A foto é opcional — quem pula
 * segue com o avatar de iniciais e pode adicionar depois em Configurações.
 */

const DESTINO = "/paciente/feed"; // mesmo destino do fluxo original pós-cadastro

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/** Corte quadrado central + redimensiona; devolve JPEG data-URL leve. */
async function cortarQuadrado(dataUrl: string, tamanho = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = tamanho;
      canvas.height = tamanho;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sem contexto de canvas"));
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function CompletarPerfil() {
  const { paciente, token, updateFoto, loading } = usePacienteAuth();
  const navigate = useNavigate();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(null); // preview recortado (data-URL)
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const [pulando, setPulando] = useState(false); // exibe o aviso "continuar sem foto"

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login-paciente" replace />;

  const nome = paciente?.nome ?? "";

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!f) return;
    setErro("");
    try {
      const raw = await fileToBase64(f);
      const recortado = await cortarQuadrado(raw);
      setFoto(recortado);
      setPulando(false);
    } catch {
      setErro("Não foi possível carregar a imagem. Tente outra.");
    }
  }

  async function continuar() {
    if (!foto) {
      setPulando(true); // sem foto → mostra o aviso antes de seguir
      return;
    }
    setUploading(true);
    setErro("");
    try {
      const res = await apiPaciente.put<{ fotoUrl: string }>(
        "/paciente-app/foto-perfil",
        { fotoBase64: foto },
      );
      updateFoto(res.data.fotoUrl);
      navigate(DESTINO, { replace: true });
    } catch {
      setErro("Não foi possível salvar sua foto. Tente novamente.");
      setUploading(false);
    }
  }

  function continuarSemFoto() {
    // Segue com o avatar de iniciais (fotoUrl permanece null).
    navigate(DESTINO, { replace: true });
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-center py-2">
          <NexvelLogo className="h-[26px]" />
        </header>

        {/* inputs ocultos: câmera (selfie) e galeria */}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleArquivo} />
        <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={handleArquivo} />

        <div className="flex flex-1 flex-col">
          {!pulando ? (
            <>
              <div className="mt-6">
                <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-white">
                  Complete seu <span className="text-nx-evo">perfil.</span>
                </h1>
                <p className="mt-2 text-body-md text-[#A1A1AA]">
                  Adicione uma foto para que seu nutricionista possa identificá-lo facilmente.
                </p>
              </div>

              {/* Avatar grande central (preview recortado ou iniciais) */}
              <div className="mt-10 flex flex-col items-center">
                <div className="rounded-full p-[3px] ring-1 ring-nx-evo/30" style={{ boxShadow: "0 0 40px -8px rgba(124,255,91,0.35)" }}>
                  <Avatar src={foto} nome={nome} tamanho={148} />
                </div>
                {foto && (
                  <p className="mt-3 text-body-sm font-medium text-nx-evo">Foto selecionada ✓</p>
                )}
              </div>

              {/* Ações */}
              <div className="mt-auto space-y-3 pt-10">
                <OutlineButton type="button" onClick={() => cameraRef.current?.click()}>
                  📷 Tirar foto
                </OutlineButton>
                <OutlineButton type="button" onClick={() => galeriaRef.current?.click()}>
                  🖼️ Escolher da galeria
                </OutlineButton>

                {erro && (
                  <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-center text-body-sm font-medium text-nx-danger">
                    {erro}
                  </p>
                )}

                <PrimaryButton type="button" onClick={continuar} disabled={uploading} className="mt-1">
                  {uploading ? "Salvando…" : "Continuar"}
                </PrimaryButton>
              </div>
            </>
          ) : (
            /* Aviso quando o paciente não quer adicionar foto */
            <>
              <div className="mt-10 flex flex-col items-center text-center">
                <Avatar src={null} nome={nome} tamanho={120} />
                <h2 className="mt-8 text-[22px] font-extrabold leading-snug tracking-tight text-white">
                  Sua foto facilita a identificação pelo nutricionista.
                </h2>
                <p className="mt-2 text-body-md text-[#A1A1AA]">
                  Você pode adicionar depois em <span className="font-semibold text-white">Configurações &gt; Perfil</span>.
                </p>
              </div>

              <div className="mt-auto space-y-3 pt-10">
                <PrimaryButton type="button" onClick={() => setPulando(false)}>
                  Adicionar foto
                </PrimaryButton>
                <TextButton type="button" onClick={continuarSemFoto}>
                  Continuar sem foto
                </TextButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
