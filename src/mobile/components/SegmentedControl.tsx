type Segment<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (id: T) => void;
  disabled?: boolean;
};

/** Control segmentado estilo iOS: pista gris con la opción activa en pastilla blanca. */
export function SegmentedControl<T extends string>({ segments, value, onChange, disabled = false }: Props<T>) {
  return (
    <div className={`m-seg-track${disabled ? " disabled" : ""}`}>
      {segments.map((segment) => {
        const active = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(segment.id)}
            className={`m-seg${active ? " active" : ""}`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
