import { apiRequest } from "./apiClient";

const TRANSFER_INVITATIONS_API_PATH = "/api/transfer-invitations";

export function createTransferInvitation(idToken, recipeId) {
  return apiRequest(
    `/api/recipes/${recipeId}/transfer-invitations`,
    {
      method: "POST",
      idToken,
    },
  );
}

export function getTransferInvitationByLink(idToken, linkToken) {
  return apiRequest(`${TRANSFER_INVITATIONS_API_PATH}/by-link/${linkToken}`, {
    method: "GET",
    idToken,
  });
}

export function getTransferInvitationByCode(idToken, invitationCode) {
  return apiRequest(`${TRANSFER_INVITATIONS_API_PATH}/by-code`, {
    method: "POST",
    idToken,
    body: { invitationCode },
  });
}

export function acceptTransferInvitation(
  idToken,
  invitationId,
  relationship,
) {
  return apiRequest(
    `${TRANSFER_INVITATIONS_API_PATH}/${invitationId}/accept`,
    {
      method: "POST",
      idToken,
      body: relationship,
    },
  );
}

