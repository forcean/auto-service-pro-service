import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'policies' })
export class PoliciesEntity {

  @Prop({ type: String })
  role: string;

  @Prop({ type: String })
  roleName: string;

  @Prop({ type: Boolean })
  userAccessList: boolean;

  @Prop({ type: [String] })
  permissions: string[];
}

export const PoliciesSchema = SchemaFactory.createForClass(PoliciesEntity);