import { IsObject, IsString } from 'class-validator';

/**
 * `data`'s inner shape is Abroad's own (varies per event, undocumented field-by-field), so it's
 * validated as a plain object rather than a nested DTO - `@ValidateNested()` would trigger the
 * global `ValidationPipe`'s `whitelist: true` to strip any field without its own decorator,
 * which would silently drop fields this module needs (e.g. `onChainId`, `refundOnChainId`).
 * Authenticity is verified by `AbroadWebhookSecretGuard`, not by validating this shape strictly.
 */
export class AbroadWebhookPayloadDto {
  @IsString()
  event!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
