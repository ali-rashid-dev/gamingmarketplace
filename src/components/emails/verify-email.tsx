import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface VerifyEmailProps {
  username?: string;
  verificationUrl: string;
  userEmail: string;
}

export const VerifyEmail = (props: VerifyEmailProps) => {
  const { username, verificationUrl, userEmail } = props;
  const displayName = username || "Gamer";

  return (
    <Html dir="ltr" lang="en">
      <Tailwind>
        <Head />
        <Preview>Verify your email address - Action required</Preview>
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[40px] shadow-sm">
            {/* Header */}
            <Section className="mb-[32px] text-center">
              <Heading className="m-0 mb-[8px] font-bold text-[28px] text-gray-900">
                Verify Your Email Address
              </Heading>
              <Text className="m-0 text-[16px] text-gray-600">
                Confirm your email to activate your GameTrade account
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px]">
              <Text className="m-0 mb-[16px] text-[16px] text-gray-700 leading-[24px]">
                Hello, {displayName}
              </Text>
              <Text className="m-0 mb-[16px] text-[16px] text-gray-700 leading-[24px]">
                Welcome to GameTrade! To complete your registration and unlock full access to your vault, please verify your email address (<strong>{userEmail}</strong>).
              </Text>
              <Text className="m-0 mb-[24px] text-[16px] text-gray-700 leading-[24px]">
                Click the button below to confirm your email. This link will expire in 1 hour.
              </Text>
            </Section>

            {/* Verify Button */}
            <Section className="mb-[32px] text-center">
              <Button
                className="box-border inline-block rounded-[8px] bg-blue-600 px-[32px] py-[16px] font-semibold text-[16px] text-white no-underline"
                href={verificationUrl}
              >
                Verify Email Address
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section className="mb-[32px]">
              <Text className="m-0 mb-[8px] text-[14px] text-gray-600 leading-[20px]">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </Text>
              <Link
                className="break-all text-[14px] text-blue-600"
                href={verificationUrl}
              >
                {verificationUrl}
              </Link>
            </Section>

            {/* Security Notice */}
            <Section className="mb-[32px] rounded-[8px] bg-gray-50 p-[20px]">
              <Text className="m-0 mb-[8px] font-semibold text-[14px] text-gray-700 leading-[20px]">
                Security Notice:
              </Text>
              <Text className="m-0 mb-[8px] text-[14px] text-gray-600 leading-[20px]">
                • If you didn&apos;t create a GameTrade account, you can safely ignore this email
              </Text>
              <Text className="m-0 mb-[8px] text-[14px] text-gray-600 leading-[20px]">
                • This verification link will expire in 1 hour
              </Text>
              <Text className="m-0 text-[14px] text-gray-600 leading-[20px]">
                • Never share this link with anyone for security
              </Text>
            </Section>

            {/* Help Section */}
            <Section className="mb-[32px]">
              <Text className="m-0 text-[14px] text-gray-600 leading-[20px]">
                Need help? Contact our support team at{" "}
                <Link
                  className="text-blue-600"
                  href="mailto:support@gametrade.com"
                >
                  support@gametrade.com
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-gray-200 border-t pt-[24px]">
              <Text className="m-0 mb-[8px] text-[12px] text-gray-500 leading-[16px]">
                This email was sent to {userEmail}
              </Text>
              <Text className="m-0 mb-[8px] text-[12px] text-gray-500 leading-[16px]">
                GameTrade, 123 Gaming Avenue, San Francisco, CA 94105
              </Text>
              <Text className="text-center text-xs text-slate-400 mt-1">
                © 2026 GameTrade. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerifyEmail;
