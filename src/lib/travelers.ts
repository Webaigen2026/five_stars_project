import { db } from "../prisma/db";

import {
  sortTravelers,
  toSafeTraveler,
  TravelerError,
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

export async function listTravelersForUser(userId: number) {
  const travelers = await db.orm.public.TravelerProfile.where({ userId }).all();
  return sortTravelers(travelers).map(toSafeTraveler);
}

export async function getOwnedTraveler(userId: number, travelerId: number) {
  const traveler = await db.orm.public.TravelerProfile.where({
    id: travelerId,
  }).first();

  if (!traveler || traveler.userId !== userId) {
    return null;
  }

  return toSafeTraveler(traveler);
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
      passportNumber: input.passportNumber,
      passportCountry: input.passportCountry,
      passportExpiry: input.passportExpiry,
      isPrimary: input.isPrimary,
    });

    return toSafeTraveler(created);
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
      passportNumber: input.passportNumber,
      passportCountry: input.passportCountry,
      passportExpiry: input.passportExpiry,
      isPrimary: input.isPrimary,
    });

    const updated = await tx.orm.public.TravelerProfile.where({
      id: travelerId,
    }).first();

    if (!updated) {
      throw new TravelerError("Traveler not found.", 404);
    }

    return toSafeTraveler(updated);
  });
}

export async function deleteOwnedTraveler(userId: number, travelerId: number) {
  const existing = await getOwnedTraveler(userId, travelerId);

  if (!existing) {
    throw new TravelerError("Traveler not found.", 404);
  }

  await db.orm.public.TravelerProfile.where({ id: travelerId }).delete();
}
