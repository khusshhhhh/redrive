import assert from "node:assert/strict";
import test from "node:test";

import { publicIdFromUrl } from "./accountDeletion";

test("extracts Redrive public IDs from managed Cloudinary URLs", () => {
  assert.equal(
    publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v123/redrive/listings/vehicle.jpg"),
    "redrive/listings/vehicle",
  );
  assert.equal(
    publicIdFromUrl("/api/files/license?asset=redrive%2Flicenses%2Ffront-id"),
    "redrive/licenses/front-id",
  );
});

test("does not treat third-party images as managed Redrive assets", () => {
  assert.equal(publicIdFromUrl("https://lh3.googleusercontent.com/avatar/photo.jpg"), null);
  assert.equal(publicIdFromUrl("https://example.com/redrive/listings/photo.jpg"), null);
});
