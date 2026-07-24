import {
  IsIn,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'publicKeyMatchesCustody', async: false })
export class PublicKeyMatchesCustodyConstraint
  implements ValidatorConstraintInterface
{
  validate(publicKey: unknown, args: ValidationArguments): boolean {
    const { custodyType } = args.object as CreateWalletDto;

    if (custodyType === 'non_custodial') {
      return typeof publicKey === 'string' && publicKey.length > 0;
    }

    return publicKey === undefined;
  }

  defaultMessage(args: ValidationArguments): string {
    const { custodyType } = args.object as CreateWalletDto;

    if (custodyType === 'non_custodial') {
      return 'publicKey is required when custodyType is non_custodial';
    }

    return 'publicKey is not allowed when custodyType is cavos_custodial';
  }
}

export class CreateWalletDto {
  @IsIn(['cavos_custodial', 'non_custodial'])
  custodyType!: 'cavos_custodial' | 'non_custodial';

  @IsOptional()
  @IsString()
  label?: string;

  @Validate(PublicKeyMatchesCustodyConstraint)
  publicKey?: string;
}
