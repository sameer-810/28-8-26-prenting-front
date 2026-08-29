import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Award, Download } from "lucide-react-native";
import { apiErrorCode } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import { Text, Button, Card, VStack, HStack, Banner } from "@shared/ui";
import type { ChildProfile } from "@modules/auth/api/authApi";
import { reportsApi, downloadReport } from "../api/progressApi";

/**
 * The yearly report and the Next-Grade Readiness Certificate.
 *
 * Both are shown in the app AND downloadable as PDFs, from one service on the
 * server — so the document a parent forwards to a school and the screen they
 * were just reading cannot disagree. That matters more here than anywhere else
 * in the product, because the PDF outlives the session.
 */
export function ReportsCard({ child }: { child: ChildProfile }) {
  const theme = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );

  const { data: report, error } = useQuery({
    queryKey: ["yearly", child.id],
    queryFn: () => reportsApi.yearly(child.id),
    retry: false,
  });

  /**
   * A 404 here means "no sessions this year yet", which is a normal state for a
   * new family rather than a failure. The card simply does not appear.
   */
  if (error && apiErrorCode(error) === "NOT_FOUND") return null;
  if (!report) return null;

  const save = async (kind: "report" | "certificate") => {
    setBusy(kind);
    setMessage(null);
    const path =
      kind === "report"
        ? `/reports/${child.id}/yearly?format=pdf`
        : `/reports/${child.id}/readiness-certificate?format=pdf`;
    const filename =
      kind === "report"
        ? `ParentAI-${child.name}-${report.year}.pdf`
        : `ParentAI-Certificate-${child.name}-${report.year}.pdf`;

    const result = await downloadReport(path, filename);
    setBusy(null);
    setMessage(
      result.ok
        ? { tone: "success", text: "Saved." }
        : { tone: "danger", text: result.reason || "The download failed." },
    );
  };

  return (
    <Card>
      <VStack gap={16}>
        <VStack gap={3}>
          <Text variant="h3">{report.year} in review</Text>
          <Text variant="caption" tone="tertiary">
            {report.totals.sessions} sessions · {report.totals.hoursStudied} hours ·{" "}
            {Math.round(report.totals.accuracy * 100)}% accuracy
          </Text>
        </VStack>

        {/**
         * Curriculum coverage is stated with its denominator, always. "23 of 57
         * Grade 5 topics" is a fact a parent can act on; "40% covered" invites
         * them to read it as a school-progress figure it is not.
         */}
        <VStack gap={4}>
          <HStack justify="space-between">
            <Text variant="label-sm" tone="tertiary">
              GRADE {child.grade} TOPICS
            </Text>
            <Text variant="label-sm" tone="tertiary" numeric>
              {report.coverage.topicsTouched} of {report.coverage.totalTopics} studied ·{" "}
              {report.coverage.topicsMastered} mastered
            </Text>
          </HStack>
        </VStack>

        {report.strengths.length > 0 ? (
          <VStack gap={3}>
            <Text variant="label-sm" tone="tertiary">
              STRONGEST
            </Text>
            <Text variant="body-sm" tone="secondary">
              {report.strengths.join(" · ")}
            </Text>
          </VStack>
        ) : null}

        {report.worthRevisiting.length > 0 ? (
          <VStack gap={3}>
            <Text variant="label-sm" style={{ color: theme.accents.apricot.color }}>
              WORTH ANOTHER LOOK
            </Text>
            <Text variant="body-sm" tone="secondary">
              {report.worthRevisiting.join(" · ")}
            </Text>
          </VStack>
        ) : null}

        {message ? (
          <Banner
            tone={message.tone === "success" ? "success" : "danger"}
            title={message.tone === "success" ? "Downloaded" : "Couldn't download"}
            body={message.text}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        <VStack gap={8}>
          <Button
            label="Save the yearly report"
            variant="secondary"
            icon={<FileText size={16} color={theme.text.primary} />}
            onPress={() => save("report")}
            loading={busy === "report"}
          />
          <Button
            label="Readiness certificate"
            variant="secondary"
            icon={<Award size={16} color={theme.text.primary} />}
            onPress={() => save("certificate")}
            loading={busy === "certificate"}
          />
        </VStack>

        {/**
         * Said before the parent downloads it, not only in the PDF's own
         * footer. A document that could be mistaken for a school assessment
         * should be understood as what it is before it is forwarded anywhere.
         */}
        <Text variant="caption" tone="disabled">
          These record work done in ParentAI. They aren't school assessments or
          exam results.
        </Text>
      </VStack>
    </Card>
  );
}
