"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateConsultationParticipantsAction,
  type UpdateConsultationParticipantsFormState,
} from "@/features/admin/consultations/actions";
import { CollapsiblePanel } from "@/features/admin/consultations/collapsible-panel";
import type { ConsultationParticipantEntry } from "@/features/admin/consultations/shared";
import type { ExpertDirectoryEntry } from "@/features/admin/experts/queries";

type ConsultationParticipantsManagerProps = {
  consultationId: string;
  experts: ExpertDirectoryEntry[];
  participants: ConsultationParticipantEntry[];
};

const initialState: UpdateConsultationParticipantsFormState = {
  status: "idle",
  message: "",
};

function getExpertStatusLabel(expert: ExpertDirectoryEntry) {
  if (!expert.is_active) {
    return "Disattivato";
  }

  if (expert.must_reset_password) {
    return "Invito inviato";
  }

  return "Attivo";
}

export function ConsultationParticipantsManager({
  consultationId,
  experts,
  participants,
}: ConsultationParticipantsManagerProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateConsultationParticipantsAction,
    initialState,
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    participants
      .filter((participant) => participant.is_active)
      .map((participant) => participant.profile_id),
  );
  const selectedParticipantIdSet = new Set(selectedParticipantIds);

  useEffect(() => {
    setSelectedParticipantIds(
      participants
        .filter((participant) => participant.is_active)
        .map((participant) => participant.profile_id),
    );
  }, [participants]);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  function handleParticipantToggle(profileId: string, checked: boolean) {
    setSelectedParticipantIds((current) => {
      if (checked) {
        return current.includes(profileId) ? current : [...current, profileId];
      }

      return current.filter((currentProfileId) => currentProfileId !== profileId);
    });
  }

  function handleSelectAll() {
    setSelectedParticipantIds(experts.map((expert) => expert.id));
  }

  return (
    <CollapsiblePanel
      defaultOpen={false}
      description="Seleziona gli esperti che parteciperanno alla consultazione prima di aprire la fase Commenti."
      eyebrow="Partecipanti"
      forceOpen={state.status !== "idle"}
      title="Assegna esperti alla consultazione"
    >
      {experts.length === 0 ? (
        <p className="muted">
          Non ci sono ancora esperti disponibili da associare.
        </p>
      ) : (
        <form action={formAction} className="auth-form">
          <input name="consultationId" type="hidden" value={consultationId} />

          {state.status === "error" && state.message ? (
            <p className="form-error">{state.message}</p>
          ) : null}

          {state.status === "success" && state.message ? (
            <p className="form-success">{state.message}</p>
          ) : null}

          <div className="consultation-participants-toolbar">
            <div className="consultation-participants-summary">
              <strong>{selectedParticipantIds.length}</strong>
              <span>
                {selectedParticipantIds.length === 1
                ? " esperto assegnato"
                : " esperti assegnati"}
              </span>
            </div>

            <button
              className="secondary-button small-button"
              disabled={isPending || selectedParticipantIds.length === experts.length}
              onClick={handleSelectAll}
              type="button"
            >
              Seleziona tutti
            </button>
          </div>

          <div className="consultation-participants-list">
            {experts.map((expert) => {
              const expertLabel =
                `${expert.first_name} ${expert.last_name}`.trim() || expert.email;

              return (
                <label
                  className={`consultation-participant-option${selectedParticipantIdSet.has(expert.id) ? " consultation-participant-option-selected" : ""}`}
                  key={expert.id}
                >
                  <input
                    checked={selectedParticipantIdSet.has(expert.id)}
                    name="participantProfileIds"
                    onChange={(event) =>
                      handleParticipantToggle(expert.id, event.target.checked)
                    }
                    type="checkbox"
                    value={expert.id}
                  />
                  <div className="consultation-participant-copy">
                    <strong>{expertLabel}</strong>
                    <span>
                      {expert.institution_name || "Istituzione non indicata"} ·{" "}
                      {expert.email}
                    </span>
                    <span className="consultation-participant-status">
                      {getExpertStatusLabel(expert)}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="compact-form-actions">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Salvataggio..." : "Salva partecipanti"}
            </button>
          </div>
        </form>
      )}
    </CollapsiblePanel>
  );
}
