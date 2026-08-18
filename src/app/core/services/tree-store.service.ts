import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export type TreeOption = {
  id: string;
  label: string;
  keywords: string[];
  archetype_weight: Record<string, number>;
  next: string;
  consequence: string;
};

export type TreeNode = {
  id: string;
  title: string;
  text: string;
  end?: boolean;
  archetype_result?: string;
  options: TreeOption[];
};

export type MergedTreeResponse = {
  rootNode: string;
  nodes: Record<string, TreeNode>;
  archetypes: Record<string, { tagline: string; description: string; suggested_class: string; master_tip: string }>;
  baseNodeIds: string[];
  overlayNodeIds: string[];
  persisted: boolean;
};

/**
 * El árbol combinado (base estático + nodos agregados por el Master) vive
 * detrás del backend, igual que en la versión Next.js: el dataset base es un
 * archivo del repo, pero los agregados del Master se guardan en Upstash (o en
 * memoria del proceso), y sólo el servidor tiene el token para escribir ahí.
 */
@Injectable({ providedIn: "root" })
export class TreeStoreService {
  private http = inject(HttpClient);

  getMergedTree(): Observable<MergedTreeResponse> {
    return this.http.get<MergedTreeResponse>(`${environment.apiBaseUrl}/tree`);
  }

  upsertNode(node: TreeNode): Observable<{ ok: boolean; persisted: boolean }> {
    return this.http.post<{ ok: boolean; persisted: boolean }>(`${environment.apiBaseUrl}/admin/tree`, node);
  }

  deleteNode(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${environment.apiBaseUrl}/admin/tree/${encodeURIComponent(id)}`);
  }
}
