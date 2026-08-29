import React, { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Download, Trash2, ShieldCheck, FileClock } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import {
  Screen,
  Text,
  Button,
  Card,
  TextField,
  VStack,
  HStack,
  Banner,
  Divider,
} from "@shared/ui";
import { useLogout } from "@modules/auth/hooks/useAuth";
import { settingsApi, downloadExport } from "../api/settingsApi";

/**
 * The DPDP rights, made usable rather than merely available.
 *
 * A privacy page that only links to a policy satisfies nobody. This is the
 * consent record the household actually gave, everything the app holds as a
 * file they can take away, and a real erasure — three things the regulation
 * requires to be *exercisable*, not just described.
 */
export default function PrivacyScreen() {
  const theme = useTheme();
  const family = useAuthStore((s) => s.family);
  const isOwner = useAuthStore((s) => s.isOwner)();
  const logout = useLogout();

  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<
    { tone: "success" | "danger"; title: string; body: string } | null
  >(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: consent } = useQuery({
    queryKey: ["consent"],
    queryFn: settingsApi.consent,
  });

  const { data: activity } = useQuery({
    queryKey: ["activity-log"],
    queryFn: settingsApi.activityLog,
  });

  const runExport = async () => {
    setExporting(true);
    setMessage(null);
    const result = await downloadExport();
    setExporting(false);
    setMessage(
      result.ok
        ? { tone: "success", title: "Exported", body: "Your file has been saved." }
        : { tone: "danger", title: "Export failed", body: result.reason || "Please try again." },
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await settingsApi.deleteFamily(confirmText);
      // The account no longer exists, so there is nothing to return to.
      await logout.mutateAsync();
    } catch (err) {
      setMessage({
        tone: "danger",
        title: "Couldn't delete",
        body: apiErrorMessage(err, "Check the name and try again."),
      });
      setDeleting(false);
    }
  };

  const nameMatches =
    confirmText.trim().toLowerCase() === (family?.name || "").trim().toLowerCase();

  return (
    <Screen title="Your data and privacy" subtitle={family?.name}>
      <VStack gap={16} style={{ maxWidth: 620 }}>
        {message ? (
          <Banner
            tone={message.tone}
            title={message.title}
            body={message.body}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        {/* ---- What we hold ------------------------------------------- */}
        <Card>
          <VStack gap={12}>
            <HStack gap={10}>
              <ShieldCheck size={17} color={theme.text.accent} />
              <Text variant="h3">What ParentAI holds</Text>
            </HStack>

            {/**
             * Stated as a list of what IS held and — just as importantly —
             * what is not. "We never ask for your child's contact details" is
             * the sentence a parent is actually looking for, and it is true by
             * construction: children have no accounts (spec DECISION 1).
             */}
            <VStack gap={7}>
              <Line text="Your name, email and password (stored hashed, never readable)." />
              <Line text="Each child's first name, grade, board and the languages you chose." />
              <Line text="Every session: what was studied, the answers given, how long it took." />
              <Line text="Any textbook page you photographed, and the text read from it." />
            </VStack>

            <View
              style={{
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: theme.accents.moss.tint,
              }}
            >
              <Text variant="body-sm" style={{ color: theme.accents.moss.color }}>
                Your children have no accounts, no logins and no contact details
                with us. We never ask for their email, phone number or location.
              </Text>
            </View>
          </VStack>
        </Card>

        {/* ---- Consent record ------------------------------------------ */}
        {consent ? (
          <Card tone="sunken">
            <VStack gap={6}>
              <Text variant="label-sm" tone="tertiary">
                YOUR CONSENT
              </Text>
              <Text variant="body-sm" tone="secondary">
                {consent.accepted
                  ? `Given on ${consent.acceptedAt ? new Date(consent.acceptedAt).toLocaleDateString() : "signup"}, against policy version ${consent.policyVersion}.`
                  : "Not yet recorded."}
              </Text>
            </VStack>
          </Card>
        ) : null}

        {/* ---- Export --------------------------------------------------- */}
        <Card>
          <VStack gap={12}>
            <HStack gap={10}>
              <Download size={17} color={theme.text.accent} />
              <Text variant="h3">Take your data with you</Text>
            </HStack>
            <Text variant="body-sm" tone="tertiary">
              Everything above, as one file. Your password is never included.
            </Text>
            <Button
              label="Export everything"
              variant="secondary"
              onPress={runExport}
              loading={exporting}
            />
          </VStack>
        </Card>

        {/* ---- Activity log --------------------------------------------- */}
        {activity?.length ? (
          <Card>
            <VStack gap={12}>
              <HStack gap={10}>
                <FileClock size={17} color={theme.text.tertiary} />
                <Text variant="h3">Recent changes</Text>
              </HStack>
              <Text variant="caption" tone="tertiary">
                Who changed what, in this household.
              </Text>
              {activity.slice(0, 8).map((a) => (
                <VStack key={a.id} gap={1}>
                  <Text variant="body-sm">{a.description || a.action}</Text>
                  <Text variant="caption" tone="disabled">
                    {a.by} · {new Date(a.createdAt).toLocaleDateString()}
                  </Text>
                </VStack>
              ))}
            </VStack>
          </Card>
        ) : null}

        {/* ---- Delete ---------------------------------------------------- */}
        <Card tone="danger">
          <VStack gap={12}>
            <HStack gap={10}>
              <Trash2 size={17} color={theme.danger.text} />
              <Text variant="h3" style={{ color: theme.danger.text }}>
                Delete everything
              </Text>
            </HStack>

            <Text variant="body-sm" style={{ color: theme.danger.text }}>
              This removes your household, both parents, every child profile and
              every session — permanently. It cannot be undone, and we keep no
              copy.
            </Text>

            {!isOwner ? (
              <Text variant="caption" style={{ color: theme.danger.text }}>
                Only the account owner can do this.
              </Text>
            ) : !showDelete ? (
              <Button
                label="Delete my household"
                variant="secondary"
                onPress={() => setShowDelete(true)}
              />
            ) : (
              <VStack gap={12}>
                {/**
                 * Typing the household's own name, matching what the API
                 * requires. A checkbox is dismissed by muscle memory; a name
                 * has to be read and then written, which is the point.
                 */}
                <TextField
                  label={`Type "${family?.name}" to confirm`}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={family?.name}
                />
                <HStack gap={8}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Keep my data"
                      onPress={() => {
                        setShowDelete(false);
                        setConfirmText("");
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Delete permanently"
                      variant="destructive"
                      disabled={!nameMatches}
                      loading={deleting}
                      onPress={runDelete}
                    />
                  </View>
                </HStack>
              </VStack>
            )}
          </VStack>
        </Card>
      </VStack>
    </Screen>
  );
}

function Line({ text }: { text: string }) {
  return (
    <HStack gap={8} align="flex-start">
      <Text variant="body-sm" tone="tertiary">
        •
      </Text>
      <Text variant="body-sm" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </HStack>
  );
}
