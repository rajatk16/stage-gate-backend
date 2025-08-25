import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Review } from './review.entity';

@Entity()
export class Talk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  speakerEmail: string;

  @Column()
  speakerName: string;

  @Column()
  spekerGender: string;

  @Column()
  talkTitle: string;

  @Column({ type: 'text', nullable: true })
  talkSummary: string;

  @Column({ type: 'text', nullable: true })
  talkDescription: string;

  @Column()
  talkLength: number;

  @Column()
  speakerLocation: string;

  @Column({ type: 'text', nullable: true })
  speakerBio: string;

  @Column({ nullable: true })
  speakerImageUrl: string;

  @Column({ nullable: true })
  speakerOccupation: string;

  @Column({ type: 'json', nullable: true })
  links: string;

  @OneToMany(() => Review, (review) => review.talk)
  reviews: Review[];
}
