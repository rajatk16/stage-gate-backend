import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { UserEntity } from './user.entity';
import { TenantEntity } from './tenant.entity';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  SUBMITTER = 'SUBMITTER',
}

@Entity({
  name: 'memberships',
})
export class MembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TenantEntity)
  tenant: TenantEntity;

  @ManyToOne(() => UserEntity)
  user: UserEntity;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
