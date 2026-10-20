import styles from "./SegmentedControl.module.css";

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className="srOnly">{label}</legend>
      {options.map((option) => (
        <label className={styles.option} key={option.value}>
          <input
            type="radio"
            name={label}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
