import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'users' })
export class UsersEntity {
  @Prop({ type: String})
  publicId: string;

  @Prop({ type: String})
  credentialId: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  phoneNumber: string;

  @Prop({ type: String })
  firstname: string;

  @Prop({ type: String })
  lastname: string;

  @Prop({ type: Boolean })
  activeFlag: boolean;

  @Prop({ type: Date })
  createdDt: Date;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  role: string;

  @Prop({ type: [String] })
  permissions: string[];

  @Prop({ type: String })
  managerId?: string;
}

export const UsersSchema = SchemaFactory.createForClass(UsersEntity);