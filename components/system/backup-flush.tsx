"use client";

import * as React from "react";
import { setupAutoFlush } from "@/lib/signup-backup";

/**
 * Sin UI propia: monta una vez en el layout y reintenta en segundo plano
 * cualquier postulación que haya quedado encolada en localStorage (porque el
 * envío falló en su momento). Se dispara al cargar cualquier página del sitio
 * y cada vez que el navegador recupera la conexión.
 */
export function BackupFlush() {
  React.useEffect(() => {
    return setupAutoFlush();
  }, []);

  return null;
}

export default BackupFlush;
