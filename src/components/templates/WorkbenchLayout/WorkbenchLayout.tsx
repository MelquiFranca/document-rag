import type { ReactNode } from "react";
import styles from "./WorkbenchLayout.module.css";

export function WorkbenchLayout({ sidebar, main }: { sidebar: ReactNode; main: ReactNode }) {
  return <main className={styles.layout}><aside>{sidebar}</aside><div>{main}</div></main>;
}
