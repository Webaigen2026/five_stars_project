import { db } from "../prisma/db";

import {
  getDecryptedPassportNumber,
  passportWriteFields,
} from "./traveler-encryption";
import {
  sortTravelers,
  toSafeTraveler,
  TravelerError,
  type SafeTraveler,
  type TravelerInput,
} from "./traveler-shared";

export {
  isTravelerGender,
  maskPassportNumber,
  parsePositiveInt,
  parseTravelerInput,
  sortTravelers,
  toSafeTraveler,
  travelerDisplayName,
  TravelerError,
  TRAVELER_GENDERS,
} from "./traveler-shared";

export type {
  SafeTraveler,
  TravelerGender,
  TravelerInput,
} from "./traveler-shared";

async function unsetOtherPrimaries(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
  exceptId: number | null
) {
  const primaries = await tx.orm.public.TravelerProfile.where({
    userId,
    isPrimary: true,
  }).all();

  for (const primary of primaries) {
    if (exceptId != null && primary.id === exceptId) {
      continue;
    }

    await tx.orm.public.TravelerProfile.where({ id: primary.id }).update({
      isPrimary: false,
    });
  }
}

const TRAVELER_SELECT = [
  "id",
  "label",
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumberEncrypted",
  "passportCountry",
  "passportExpiry",
  "isPrimary",
] as const;

function toDecryptedTraveler(traveler: {
  id: number;
  label: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumberEncrypted?: string | null;
  passportCountry: string;
  passportExpiry: string;
  isPrimary: boolean;
}): SafeTraveler {
  return toSafeTraveler({
    id: traveler.id,
    label: traveler.label,
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    dateOfBirth: traveler.dateOfBirth,
    gender: traveler.gender,
    nationality: traveler.nationality,
    passportNumber: getDecryptedPassportNumber(traveler),
    passportCountry: traveler.passportCountry,
    passportExpiry: traveler.passportExpiry,
    isPrimary: traveler.isPrimary,
  });
}

export async function listTravelersForUser(userId: number) {
  const travelers = await db.orm.public.TravelerProfile.select(
    ...TRAVELER_SELECT
  )
    .where({ userId })
    .all();
  return sortTravelers(travelers).map(toDecryptedTraveler);
}

export async function getOwnedTraveler(userId: number, travelerId: number) {
  const traveler = await db.orm.public.TravelerProfile.select(
    ...TRAVELER_SELECT
  )
    .where({
      id: travelerId,
      userId,
    })
    .first();

  if (!traveler) {
    return null;
  }

  return toDecryptedTraveler(traveler);
}

export async function createTraveler(userId: number, input: TravelerInput) {
  return db.transaction(async (tx) => {
    if (input.isPrimary) {
      await unsetOtherPrimaries(tx, userId, null);
    }

    const created = await tx.orm.public.TravelerProfile.create({
      userId,
      label: input.label,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      nationality: input.nationality,
      ...passportWriteFields(input.passportNumber),
      passportCountry: input.passportCountry,
      passportExpiry: input.passportExpiry,
      isPrimary: input.isPrimary,
    });

    return toDecryptedTraveler(created);
  });
}

export async function updateOwnedTraveler(
  userId: number,
  travelerId: number,
  input: TravelerInput
) {
  const existing = await getOwnedTraveler(userId, travelerId);

  if (!existing) {
    throw new TravelerError("Traveler not found.", 404);
  }

  return db.transaction(async (tx) => {
    if (input.isPrimary) {
      await unsetOtherPrimaries(tx, userId, travelerId);
    }

    await tx.orm.public.TravelerProfile.where({ id: travelerId }).update({
      label: input.label,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      nationality: input.nationality,
      ...passportWriteFields(input.passportNumber),
      passportCountry: input.passportCountry,
      passportExpiry: input.passportExpiry,
      isPrimary: input.isPrimary,
    });

    const updated = await tx.orm.public.TravelerProfile.select(
      ...TRAVELER_SELECT
    )
      .where({
        id: travelerId,
      })
      .first();

    if (!updated) {
      throw new TravelerError("Traveler not found.", 404);
    }

    return toDecryptedTraveler(updated);
  });
}

export async function deleteOwnedTraveler(userId: number, travelerId: number) {
  const existing = await getOwnedTraveler(userId, travelerId);

  if (!existing) {
    throw new TravelerError("Traveler not found.", 404);
  }

  await db.orm.public.TravelerProfile.where({ id: travelerId }).delete();
}
