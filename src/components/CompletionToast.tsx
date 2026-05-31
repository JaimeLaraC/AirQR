type Props = {
  show: boolean;
  title: string;
  message: string;
};

export function CompletionToast({ show, title, message }: Props) {
  if (!show) {
    return null;
  }

  return (
    <div className="completion-toast" role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
