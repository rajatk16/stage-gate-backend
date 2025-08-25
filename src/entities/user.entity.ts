import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

import { Review } from './review.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  REVIEWER = 'reviewer',
}

@Entity({})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.REVIEWER })
  role: UserRole;

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @Column({ default: new Date().toISOString() })
  createdAt: string;

  @Column({ default: new Date().toISOString() })
  updatedAt: string;

  @Column({ default: true })
  isActive: boolean;
}
