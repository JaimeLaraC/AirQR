type Props = {
  visible: boolean;
  label: string;
  done: number;
  total: number;
  detail?: string;
};

export function BottomTransferBar({ visible, label, done, total, detail }: Props) {
  if (!visible) {
    return null;
  }

  const safeTotal = Math.max(0, total);
  const safeDone = Math.min(Math.max(0, done), safeTotal);
  const percent = safeTotal > 0 ? Math.round((safeDone / safeTotal) * 100) : 0;
  const remaining = Math.max(0, safeTotal - safeDone);

  return (
    <div className="bottom-transfer-bar">
      <div className="bottom-transfer-copy">
        <strong>{label}</strong>
        <span>{safeTotal > 0 ? `${remaining} fragmentos restantes · ${percent}%` : "Preparando transferencia"}</span>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="bottom-transfer-track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
