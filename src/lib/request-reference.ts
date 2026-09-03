import { randomInt } from "node:crypto";

import { db } from "../prisma/db";
import { CargoRequestError } from "./cargo";
import { CharterRequestError } from "./charter";
import { ContactMessageError } from "./contact";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix() {
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }

  return suffix;
}

export async function createUniqueCargoReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = `CG-${randomSuffix()}`;
    const existing = await db.orm.public.CargoRequest.where({
      reference,
    }).first();

    if (!existing) {
      return reference;
    }
  }

  throw new CargoRequestError("Unable to generate a unique cargo reference.", 500);
}

export async function createUniqueCharterReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = `CH-${randomSuffix()}`;
    const existing = await db.orm.public.CharterRequest.where({
      reference,
    }).first();

    if (!existing) {
      return reference;
    }
  }

  throw new CharterRequestError(
    "Unable to generate a unique charter reference.",
    500
  );
}

export async function createUniqueContactReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = `CT-${randomSuffix()}`;
    const existing = await db.orm.public.ContactMessage.where({
      reference,
    }).first();

    if (!existing) {
      return reference;
    }
  }

  throw new ContactMessageError(
    "Unable to generate a unique contact reference.",
    500
  );
}
