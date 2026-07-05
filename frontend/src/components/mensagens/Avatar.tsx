// Avatar com fallback para iniciais quando o paciente/nutri não tem foto.
export default function Avatar({
  url,
  nome,
  className = "",
}: {
  url?: string | null;
  nome: string;
  className?: string;
}) {
  if (url) {
    return <img alt={nome} src={url} className={`object-cover ${className}`} />;
  }
  const iniciais = nome
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-nx-primary/20 text-nx-primary font-bold text-xs ${className}`}>
      {iniciais}
    </div>
  );
}
