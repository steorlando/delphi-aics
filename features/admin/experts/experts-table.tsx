"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExpertAction,
  type DeleteExpertFormState,
  updateExpertAction,
  type UpdateExpertFormState,
} from "@/features/admin/experts/actions";
import type { ExpertDirectoryEntry } from "@/features/admin/experts/queries";
import { ResendInviteButton } from "@/features/admin/experts/resend-invite-button";

type ExpertsTableProps = {
  experts: ExpertDirectoryEntry[];
};

type SortKey = "name" | "institution" | "email" | "status" | "created_at";
type SortDirection = "asc" | "desc";

const initialUpdateState: UpdateExpertFormState = {
  status: "idle",
  message: "",
};

const initialDeleteState: DeleteExpertFormState = {
  status: "idle",
  message: "",
};

function normalizeFilterText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateInputValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getExpertName(expert: ExpertDirectoryEntry) {
  return `${expert.first_name} ${expert.last_name}`.trim();
}

function getStatusFilterValue(expert: ExpertDirectoryEntry) {
  if (!expert.is_active) {
    return "inactive";
  }

  if (expert.must_reset_password) {
    return "pending";
  }

  return "active";
}

function getStatusSortRank(expert: ExpertDirectoryEntry) {
  if (!expert.is_active) {
    return 0;
  }

  if (expert.must_reset_password) {
    return 1;
  }

  return 2;
}

function getSortIndicator(
  activeKey: SortKey,
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  if (activeKey !== sortKey) {
    return "↕";
  }

  return sortDirection === "asc" ? "↑" : "↓";
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="m15.232 5.232 3.536 3.536M7.5 18.5l3.318-.664a2.25 2.25 0 0 0 1.146-.614l7.36-7.36a1.5 1.5 0 0 0 0-2.122l-2.064-2.064a1.5 1.5 0 0 0-2.121 0l-7.36 7.36a2.25 2.25 0 0 0-.615 1.146L6.5 17.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M4.5 7.5h15M9.75 3.75h4.5m-7.5 3.75.563 9.008A1.5 1.5 0 0 0 8.81 18h6.38a1.5 1.5 0 0 0 1.497-1.492L17.25 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 10.5v4.5M13.5 10.5v4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DeleteExpertButton({
  profileId,
  expertLabel,
}: {
  profileId: string;
  expertLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    deleteExpertAction,
    initialDeleteState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={formAction}
      className="inline-action-form table-inline-action-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vuoi eliminare definitivamente l'esperto ${expertLabel}? Questa operazione rimuove anche l'accesso in Supabase Auth.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="profileId" type="hidden" value={profileId} />
      <button
        aria-label={`Elimina ${expertLabel}`}
        className="secondary-button small-button icon-action-button destructive-button"
        disabled={isPending}
        title="Elimina esperto"
        type="submit"
      >
        <TrashIcon />
        <span className="sr-only">
          {isPending ? "Eliminazione..." : "Elimina"}
        </span>
      </button>
      {state.status === "error" && state.message ? (
        <p className="form-error compact-message">{state.message}</p>
      ) : null}
    </form>
  );
}

export function ExpertsTable({ experts }: ExpertsTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [nameFilter, setNameFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
  const [editingExpert, setEditingExpert] = useState<ExpertDirectoryEntry | null>(
    null,
  );
  const [updateState, updateAction, isUpdating] = useActionState(
    updateExpertAction,
    initialUpdateState,
  );

  useEffect(() => {
    if (updateState.status === "success") {
      setEditingExpert(null);
      router.refresh();
    }
  }, [router, updateState.status]);

  const filteredExperts = useMemo(() => {
    const filtered = experts.filter((expert) => {
      if (
        nameFilter &&
        !normalizeFilterText(getExpertName(expert)).includes(
          normalizeFilterText(nameFilter),
        )
      ) {
        return false;
      }

      if (
        institutionFilter &&
        !normalizeFilterText(expert.institution_name).includes(
          normalizeFilterText(institutionFilter),
        )
      ) {
        return false;
      }

      if (
        emailFilter &&
        !normalizeFilterText(expert.email).includes(normalizeFilterText(emailFilter))
      ) {
        return false;
      }

      if (statusFilter && getStatusFilterValue(expert) !== statusFilter) {
        return false;
      }

      if (
        createdAtFilter &&
        formatDateInputValue(expert.created_at) !== createdAtFilter
      ) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison = getExpertName(left).localeCompare(getExpertName(right), "it");
      } else if (sortKey === "institution") {
        comparison = (left.institution_name || "").localeCompare(
          right.institution_name || "",
          "it",
        );
      } else if (sortKey === "email") {
        comparison = left.email.localeCompare(right.email, "it");
      } else if (sortKey === "status") {
        comparison = getStatusSortRank(left) - getStatusSortRank(right);
      } else {
        comparison =
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }

      return sortDirection === "asc" ? comparison : comparison * -1;
    });
  }, [
    createdAtFilter,
    emailFilter,
    experts,
    institutionFilter,
    nameFilter,
    sortDirection,
    sortKey,
    statusFilter,
  ]);

  const hasActiveFilters = Boolean(
    nameFilter || institutionFilter || emailFilter || statusFilter || createdAtFilter,
  );

  return (
    <>
      <div className="table-results-bar">
        <p className="muted">
          Visualizzati <strong>{filteredExperts.length}</strong> di{" "}
          <strong>{experts.length}</strong> esperti.
        </p>
        {hasActiveFilters ? (
          <button
            className="secondary-button small-button"
            onClick={() => {
              setNameFilter("");
              setInstitutionFilter("");
              setEmailFilter("");
              setStatusFilter("");
              setCreatedAtFilter("");
            }}
            type="button"
          >
            Azzera filtri
          </button>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <button
                  className="table-sort-button"
                  onClick={() => {
                    if (sortKey === "name") {
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortKey("name");
                      setSortDirection("asc");
                    }
                  }}
                  type="button"
                >
                  Nome <span>{getSortIndicator("name", sortKey, sortDirection)}</span>
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  onClick={() => {
                    if (sortKey === "institution") {
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortKey("institution");
                      setSortDirection("asc");
                    }
                  }}
                  type="button"
                >
                  Istituzione{" "}
                  <span>{getSortIndicator("institution", sortKey, sortDirection)}</span>
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  onClick={() => {
                    if (sortKey === "email") {
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortKey("email");
                      setSortDirection("asc");
                    }
                  }}
                  type="button"
                >
                  Email <span>{getSortIndicator("email", sortKey, sortDirection)}</span>
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  onClick={() => {
                    if (sortKey === "status") {
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortKey("status");
                      setSortDirection("asc");
                    }
                  }}
                  type="button"
                >
                  Stato <span>{getSortIndicator("status", sortKey, sortDirection)}</span>
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  onClick={() => {
                    if (sortKey === "created_at") {
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortKey("created_at");
                      setSortDirection("desc");
                    }
                  }}
                  type="button"
                >
                  Creato il{" "}
                  <span>{getSortIndicator("created_at", sortKey, sortDirection)}</span>
                </button>
              </th>
              <th>Azioni</th>
            </tr>
            <tr className="table-filter-row">
              <th>
                <input
                  aria-label="Filtra per nome"
                  className="table-filter-input"
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder="Filtra nome"
                  type="text"
                  value={nameFilter}
                />
              </th>
              <th>
                <input
                  aria-label="Filtra per istituzione"
                  className="table-filter-input"
                  onChange={(event) => setInstitutionFilter(event.target.value)}
                  placeholder="Filtra istituzione"
                  type="text"
                  value={institutionFilter}
                />
              </th>
              <th>
                <input
                  aria-label="Filtra per email"
                  className="table-filter-input"
                  onChange={(event) => setEmailFilter(event.target.value)}
                  placeholder="Filtra email"
                  type="text"
                  value={emailFilter}
                />
              </th>
              <th>
                <select
                  aria-label="Filtra per stato"
                  className="table-filter-input"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="">Tutti</option>
                  <option value="active">Attivi</option>
                  <option value="pending">Password iniziale in attesa</option>
                  <option value="inactive">Inattivi</option>
                </select>
              </th>
              <th>
                <input
                  aria-label="Filtra per data di creazione"
                  className="table-filter-input"
                  onChange={(event) => setCreatedAtFilter(event.target.value)}
                  type="date"
                  value={createdAtFilter}
                />
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredExperts.length === 0 ? (
              <tr>
                <td className="empty-table-message" colSpan={6}>
                  Nessun esperto corrisponde ai filtri selezionati.
                </td>
              </tr>
            ) : (
              filteredExperts.map((expert) => (
                <tr key={expert.id}>
                  <td>{getExpertName(expert)}</td>
                  <td>{expert.institution_name || "—"}</td>
                  <td>{expert.email}</td>
                  <td>
                    <div className="status-stack">
                      <span className="status-badge">
                        {expert.is_active ? "Attivo" : "Inattivo"}
                      </span>
                      {expert.must_reset_password ? (
                        <span className="status-badge warning-badge">
                          Cambio password in attesa
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatDate(expert.created_at)}</td>
                  <td>
                    <div className="table-action-stack">
                      <button
                        aria-label={`Modifica ${getExpertName(expert)}`}
                        className="secondary-button small-button icon-action-button"
                        onClick={() => setEditingExpert(expert)}
                        title="Modifica esperto"
                        type="button"
                      >
                        <EditIcon />
                        <span className="sr-only">Modifica</span>
                      </button>

                      {expert.must_reset_password && expert.is_active ? (
                        <ResendInviteButton compact profileId={expert.id} />
                      ) : null}

                      <DeleteExpertButton
                        expertLabel={getExpertName(expert)}
                        profileId={expert.id}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingExpert ? (
        <div
          aria-labelledby="edit-expert-title"
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setEditingExpert(null)}
          role="dialog"
        >
          <div
            className="modal-card modal-card-wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card-header">
              <div>
                <span className="eyebrow">Modifica</span>
                <h3 id="edit-expert-title">Aggiorna esperto</h3>
              </div>
              <button
                aria-label="Chiudi modifica esperto"
                className="secondary-button small-button"
                onClick={() => setEditingExpert(null)}
                type="button"
              >
                Chiudi
              </button>
            </div>

            {updateState.status === "error" && updateState.message ? (
              <p className="form-error">{updateState.message}</p>
            ) : null}

            <form
              action={updateAction}
              className="auth-form modal-form-grid"
              key={editingExpert.id}
            >
              <input name="profileId" type="hidden" value={editingExpert.id} />

              <label className="field">
                <span>Nome</span>
                <input
                  defaultValue={editingExpert.first_name}
                  name="firstName"
                  required
                  type="text"
                />
              </label>

              <label className="field">
                <span>Cognome</span>
                <input
                  defaultValue={editingExpert.last_name}
                  name="lastName"
                  required
                  type="text"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  defaultValue={editingExpert.email}
                  name="email"
                  required
                  type="email"
                />
              </label>

              <label className="field">
                <span>Istituzione</span>
                <input
                  defaultValue={editingExpert.institution_name || ""}
                  name="institutionName"
                  type="text"
                />
              </label>

              <label className="field">
                <span>Stato account</span>
                <select
                  defaultValue={editingExpert.is_active ? "true" : "false"}
                  name="isActive"
                >
                  <option value="true">Attivo</option>
                  <option value="false">Inattivo</option>
                </select>
              </label>

              <div className="compact-form-actions modal-form-actions">
                <button className="primary-button" disabled={isUpdating} type="submit">
                  {isUpdating ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
