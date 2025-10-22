-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."InstanceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'OFFLINE', 'ERROR', 'OPEN', 'CLOSED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "public"."whatlead_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatlead_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatleadCompanyId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "maxInstances" INTEGER NOT NULL DEFAULT 2,
    "messagesPerDay" INTEGER NOT NULL DEFAULT 20,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "support" TEXT NOT NULL DEFAULT 'basic',
    "trialEndDate" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "referredBy" TEXT,
    "evoAiUserId" TEXT,
    "image" TEXT,
    "client_Id" TEXT,
    "hotmartCustomerId" TEXT,
    "hotmartSubscriberCode" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "subscriptionEndDate" TIMESTAMP(3),
    "subscriptionStatus" TEXT,

    CONSTRAINT "whatlead_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatleadparceiroconfigs" (
    "id" TEXT NOT NULL,
    "createdAt" DATE,
    "name" TEXT,
    "productdefault" TEXT,
    "campaignstatus" TEXT,
    "enablecuration" BOOLEAN,
    "enabletosendustolead" BOOLEAN,
    "enabled" BOOLEAN,
    "isconversationia" BOOLEAN,
    "campaignnumberbusiness" TEXT,
    "whatsappprovider" TEXT,
    "enabletosendprovider" BOOLEAN,
    "enabletosecondcallprovider" BOOLEAN,
    "integrationconfiguration" JSONB,
    "integrationname" TEXT,
    "templatelistvars" JSONB[],
    "metaconfiguration" JSONB,
    "messageperruns" JSONB[],
    "notifyconfiguration" JSONB,
    "updatedAt" DATE,
    "whitelabel_config" TEXT NOT NULL,
    "whatleadCompanyId" TEXT,

    CONSTRAINT "whatleadparceiroconfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatleadleads" (
    "id" TEXT NOT NULL,
    "externalid" TEXT,
    "sourceid" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "lastmessagesent" TIMESTAMP(3),
    "stepsecondcalltemplate" INTEGER,
    "stepnointeraction" INTEGER,
    "nointeractionquantity" INTEGER,
    "accepttemplate" BOOLEAN,
    "acceptsecondtemplate" BOOLEAN,
    "status" TEXT,
    "dialog" JSONB[],
    "configid" TEXT NOT NULL,
    "whitelabelconfig" TEXT NOT NULL,
    "lastintent" TEXT,
    "broker" TEXT,
    "origin" TEXT,
    "send" BOOLEAN,
    "sendAt" TIMESTAMP(3),
    "isBusinessAutoResponder" BOOLEAN DEFAULT false,
    "startmessage" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "schedulingdata" TEXT,
    "productchoosebyclient" TEXT,
    "productid" INTEGER,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "curation" JSONB,

    CONSTRAINT "whatleadleads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Instance" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "number" TEXT,
    "ownerJid" TEXT,
    "profilePicUrl" TEXT,
    "integration" TEXT NOT NULL DEFAULT 'WHATSAPP-BAILEYS',
    "token" TEXT,
    "clientName" TEXT,
    "profileName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),
    "disconnectionObject" JSONB,
    "disconnectionReasonCode" TEXT,
    "proxyConfig" JSONB,
    "typebot" JSONB,
    "connectionStatus" "public"."InstanceStatus" NOT NULL DEFAULT 'DISCONNECTED',

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaStats" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" INTEGER NOT NULL DEFAULT 0,
    "image" INTEGER NOT NULL DEFAULT 0,
    "video" INTEGER NOT NULL DEFAULT 0,
    "audio" INTEGER NOT NULL DEFAULT 0,
    "sticker" INTEGER NOT NULL DEFAULT 0,
    "reaction" INTEGER NOT NULL DEFAULT 0,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "totalDaily" INTEGER NOT NULL DEFAULT 0,
    "totalAllTime" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarmupStats" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "warmupTime" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3),
    "pauseTime" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaStatsId" TEXT,
    "mediaReceivedId" TEXT,

    CONSTRAINT "WarmupStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT NOT NULL,
    "message" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaCaption" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledStatus" TEXT DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "minDelay" INTEGER NOT NULL DEFAULT 5,
    "maxDelay" INTEGER NOT NULL DEFAULT 30,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "instanceId" TEXT,
    "isAiResponder" JSONB,
    "maxMessagesPerInstance" INTEGER,
    "rotationStrategy" TEXT,
    "selectedInstances" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useRotation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "whatlead_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignDispatch" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_campaign_messages" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatlead_campaign_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_campaign_leads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engagement" TEXT,
    "segment" TEXT,
    "syncedAt" TIMESTAMP(3),
    "syncedWithCRM" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "whatlead_campaign_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_schedules" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "mediaCaption" TEXT,
    "minDelay" INTEGER NOT NULL DEFAULT 5,
    "maxDelay" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_campaign_statistics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatlead_campaign_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignLeadId" TEXT,
    "leadId" TEXT,
    "messageId" TEXT NOT NULL,
    "messageDate" TIMESTAMP(3) NOT NULL,
    "messageType" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "statusHistory" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageAnalytics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "respondedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MessageAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastInteraction" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_message_attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mimeType" TEXT,
    "name" TEXT,

    CONSTRAINT "whatlead_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_campaign_error_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatlead_campaign_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_contact_notes" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "whatlead_contact_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatlead_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatlead_hotmart_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "approvedDate" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL,
    "installments" INTEGER NOT NULL,
    "subscriberCode" TEXT,
    "planName" TEXT,
    "nextChargeDate" TIMESTAMP(3),
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatlead_hotmart_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customerId" TEXT,
    "metadata" JSONB,
    "disputeStatus" TEXT,
    "disputeReason" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ContactCampaigns" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactCampaigns_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "whatlead_companies_createdAt_idx" ON "public"."whatlead_companies"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "whatlead_users_email_key" ON "public"."whatlead_users"("email");

-- CreateIndex
CREATE INDEX "whatlead_users_email_profile_phone_createdAt_idx" ON "public"."whatlead_users"("email", "profile", "phone", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "whatlead_users_hotmartCustomerId_idx" ON "public"."whatlead_users"("hotmartCustomerId");

-- CreateIndex
CREATE INDEX "whatlead_users_subscriptionStatus_idx" ON "public"."whatlead_users"("subscriptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "whatleadparceiroconfigs_campaignnumberbusiness_key" ON "public"."whatleadparceiroconfigs"("campaignnumberbusiness");

-- CreateIndex
CREATE INDEX "whatleadleads_phone_configid_idx" ON "public"."whatleadleads"("phone", "configid");

-- CreateIndex
CREATE UNIQUE INDEX "Instance_instanceName_key" ON "public"."Instance"("instanceName");

-- CreateIndex
CREATE INDEX "Instance_userId_idx" ON "public"."Instance"("userId");

-- CreateIndex
CREATE INDEX "Instance_instanceName_idx" ON "public"."Instance"("instanceName");

-- CreateIndex
CREATE INDEX "Instance_connectionStatus_idx" ON "public"."Instance"("connectionStatus");

-- CreateIndex
CREATE INDEX "MediaStats_instanceName_idx" ON "public"."MediaStats"("instanceName");

-- CreateIndex
CREATE INDEX "MediaStats_date_idx" ON "public"."MediaStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WarmupStats_instanceName_key" ON "public"."WarmupStats"("instanceName");

-- CreateIndex
CREATE INDEX "WarmupStats_userId_idx" ON "public"."WarmupStats"("userId");

-- CreateIndex
CREATE INDEX "WarmupStats_instanceName_idx" ON "public"."WarmupStats"("instanceName");

-- CreateIndex
CREATE INDEX "whatlead_campaigns_userId_idx" ON "public"."whatlead_campaigns"("userId");

-- CreateIndex
CREATE INDEX "whatlead_campaigns_instanceId_idx" ON "public"."whatlead_campaigns"("instanceId");

-- CreateIndex
CREATE INDEX "whatlead_campaigns_status_idx" ON "public"."whatlead_campaigns"("status");

-- CreateIndex
CREATE INDEX "whatlead_campaign_messages_campaignId_idx" ON "public"."whatlead_campaign_messages"("campaignId");

-- CreateIndex
CREATE INDEX "whatlead_campaign_leads_campaignId_idx" ON "public"."whatlead_campaign_leads"("campaignId");

-- CreateIndex
CREATE INDEX "whatlead_campaign_leads_phone_idx" ON "public"."whatlead_campaign_leads"("phone");

-- CreateIndex
CREATE INDEX "whatlead_campaign_leads_status_idx" ON "public"."whatlead_campaign_leads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatlead_campaign_leads_campaignId_phone_key" ON "public"."whatlead_campaign_leads"("campaignId", "phone");

-- CreateIndex
CREATE INDEX "campaign_schedules_campaignId_idx" ON "public"."campaign_schedules"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_schedules_instanceName_idx" ON "public"."campaign_schedules"("instanceName");

-- CreateIndex
CREATE INDEX "campaign_schedules_scheduledDate_idx" ON "public"."campaign_schedules"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "whatlead_campaign_statistics_campaignId_key" ON "public"."whatlead_campaign_statistics"("campaignId");

-- CreateIndex
CREATE INDEX "whatlead_campaign_statistics_campaignId_idx" ON "public"."whatlead_campaign_statistics"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLog_messageId_key" ON "public"."MessageLog"("messageId");

-- CreateIndex
CREATE INDEX "MessageLog_campaignId_idx" ON "public"."MessageLog"("campaignId");

-- CreateIndex
CREATE INDEX "MessageLog_campaignLeadId_idx" ON "public"."MessageLog"("campaignLeadId");

-- CreateIndex
CREATE INDEX "MessageLog_leadId_idx" ON "public"."MessageLog"("leadId");

-- CreateIndex
CREATE INDEX "MessageLog_messageId_idx" ON "public"."MessageLog"("messageId");

-- CreateIndex
CREATE INDEX "MessageLog_status_idx" ON "public"."MessageLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAnalytics_campaignId_date_key" ON "public"."MessageAnalytics"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "public"."Contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_userId_phone_idx" ON "public"."Contact"("userId", "phone");

-- CreateIndex
CREATE INDEX "whatlead_campaign_error_logs_campaignId_idx" ON "public"."whatlead_campaign_error_logs"("campaignId");

-- CreateIndex
CREATE INDEX "whatlead_contact_notes_contactId_idx" ON "public"."whatlead_contact_notes"("contactId");

-- CreateIndex
CREATE INDEX "whatlead_message_reactions_messageId_idx" ON "public"."whatlead_message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "whatlead_message_reactions_messageId_userId_key" ON "public"."whatlead_message_reactions"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "whatlead_hotmart_transactions_transactionId_key" ON "public"."whatlead_hotmart_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_userId_idx" ON "public"."whatlead_hotmart_transactions"("userId");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_transactionId_idx" ON "public"."whatlead_hotmart_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_event_idx" ON "public"."whatlead_hotmart_transactions"("event");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_status_idx" ON "public"."whatlead_hotmart_transactions"("status");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_buyerEmail_idx" ON "public"."whatlead_hotmart_transactions"("buyerEmail");

-- CreateIndex
CREATE INDEX "whatlead_hotmart_transactions_subscriberCode_idx" ON "public"."whatlead_hotmart_transactions"("subscriberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "public"."Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "public"."Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "public"."Payment"("userId");

-- CreateIndex
CREATE INDEX "_ContactCampaigns_B_index" ON "public"."_ContactCampaigns"("B");

-- AddForeignKey
ALTER TABLE "public"."whatlead_users" ADD CONSTRAINT "whatlead_users_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "public"."whatlead_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_users" ADD CONSTRAINT "whatlead_users_whatleadCompanyId_fkey" FOREIGN KEY ("whatleadCompanyId") REFERENCES "public"."whatlead_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatleadparceiroconfigs" ADD CONSTRAINT "whatleadparceiroconfigs_whatleadCompanyId_fkey" FOREIGN KEY ("whatleadCompanyId") REFERENCES "public"."whatlead_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatleadleads" ADD CONSTRAINT "whatleadleads_configid_fkey" FOREIGN KEY ("configid") REFERENCES "public"."whatleadparceiroconfigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Instance" ADD CONSTRAINT "Instance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaStats" ADD CONSTRAINT "MediaStats_instanceName_fkey" FOREIGN KEY ("instanceName") REFERENCES "public"."Instance"("instanceName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarmupStats" ADD CONSTRAINT "WarmupStats_instanceName_fkey" FOREIGN KEY ("instanceName") REFERENCES "public"."Instance"("instanceName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarmupStats" ADD CONSTRAINT "WarmupStats_mediaReceivedId_fkey" FOREIGN KEY ("mediaReceivedId") REFERENCES "public"."MediaStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarmupStats" ADD CONSTRAINT "WarmupStats_mediaStatsId_fkey" FOREIGN KEY ("mediaStatsId") REFERENCES "public"."MediaStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarmupStats" ADD CONSTRAINT "WarmupStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaigns" ADD CONSTRAINT "whatlead_campaigns_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "public"."Instance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaigns" ADD CONSTRAINT "whatlead_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDispatch" ADD CONSTRAINT "CampaignDispatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDispatch" ADD CONSTRAINT "CampaignDispatch_instanceName_fkey" FOREIGN KEY ("instanceName") REFERENCES "public"."Instance"("instanceName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaign_messages" ADD CONSTRAINT "whatlead_campaign_messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaign_leads" ADD CONSTRAINT "whatlead_campaign_leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaign_leads" ADD CONSTRAINT "whatlead_campaign_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_schedules" ADD CONSTRAINT "campaign_schedules_instanceName_fkey" FOREIGN KEY ("instanceName") REFERENCES "public"."Instance"("instanceName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaign_statistics" ADD CONSTRAINT "whatlead_campaign_statistics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageLog" ADD CONSTRAINT "MessageLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageLog" ADD CONSTRAINT "MessageLog_campaignLeadId_fkey" FOREIGN KEY ("campaignLeadId") REFERENCES "public"."whatlead_campaign_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageLog" ADD CONSTRAINT "MessageLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."whatleadleads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageAnalytics" ADD CONSTRAINT "MessageAnalytics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_campaign_error_logs" ADD CONSTRAINT "whatlead_campaign_error_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_contact_notes" ADD CONSTRAINT "whatlead_contact_notes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_contact_notes" ADD CONSTRAINT "whatlead_contact_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_message_reactions" ADD CONSTRAINT "whatlead_message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatlead_hotmart_transactions" ADD CONSTRAINT "whatlead_hotmart_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."whatlead_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ContactCampaigns" ADD CONSTRAINT "_ContactCampaigns_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."whatlead_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ContactCampaigns" ADD CONSTRAINT "_ContactCampaigns_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

