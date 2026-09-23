import { IsObject, Matches } from 'class-validator';

const PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

export class SoroswapBuildDto {
  @IsObject()
  quote!: Record<string, unknown>;

  @Matches(PUBLIC_KEY_PATTERN)
  from!: string;

  @Matches(PUBLIC_KEY_PATTERN)
  to!: string;
}
