import React, { useMemo } from "react";
import { View } from "react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import {
  Screen,
  Text,
  Card,
  VStack,
  HStack,
  ErrorState,
  Skeleton,
  Divider,
} from "@shared/ui";
import { useAdminCurriculum } from "../hooks/useAdmin";
import { count } from "../format";

/** Grades 1–8, per DECISION 11. A board missing one cannot serve that year. */
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Curriculum coverage, grouped by board. The question is "is this board
 * usable?", not "how many topics are there?" — a flat count of three thousand
 * hides a missing grade 6, which leaves every grade-6 family on that board
 * without a confident match. Gaps are rendered as gaps.
 */
export default function AdminCurriculumScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch, isRefetching } =
    useAdminCurriculum();

  const boards = useMemo(() => {
    const grouped: Record<
      string,
      Record<number, { subjects: string[]; topics: number; chapters: number }>
    > = {};
    for (const row of data || []) {
      grouped[row.board] = grouped[row.board] || {};
      const bucket = (grouped[row.board][row.grade] = grouped[row.board][
        row.grade
      ] || {
        subjects: [],
        topics: 0,
        chapters: 0,
      });
      bucket.subjects.push(row.subject);
      bucket.topics += row.topics;
      bucket.chapters += row.chapters;
    }
    return grouped;
  }, [data]);

  const total = (data || []).reduce((s, r) => s + r.topics, 0);

  if (isLoading) {
    return (
      <Screen title="Curriculum coverage">
        <VStack gap={12}>
          <Skeleton height={140} />
          <Skeleton height={140} />
        </VStack>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title="Curriculum coverage">
        <ErrorState
          message={apiErrorMessage(error, "Could not load coverage")}
          onRetry={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Curriculum coverage"
      subtitle={`${count(total)} active topics. A missing grade means families on that board and grade get no confident topic match.`}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <VStack gap={16}>
        {Object.entries(boards)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([board, grades]) => {
            const missing = GRADES.filter((g) => !grades[g]);

            return (
              <Card key={board}>
                <VStack gap={10}>
                  <HStack justify="space-between" align="center" wrap gap={8}>
                    <Text variant="h3">{board.toUpperCase()}</Text>
                    <Text variant="caption" tone="tertiary" numeric>
                      {count(
                        Object.values(grades).reduce((s, g) => s + g.topics, 0),
                      )}{" "}
                      topics
                    </Text>
                  </HStack>

                  {missing.length ? (
                    <View
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: theme.warning.bg,
                      }}
                    >
                      <Text
                        variant="body-sm"
                        style={{ color: theme.warning.text }}
                      >
                        No topics for grade{missing.length > 1 ? "s" : ""}{" "}
                        {missing.join(", ")} — families there cannot be matched
                        to a topic.
                      </Text>
                    </View>
                  ) : null}

                  {GRADES.filter((g) => grades[g]).map((grade, i) => {
                    const g = grades[grade];
                    return (
                      <View key={grade}>
                        {i > 0 ? <Divider /> : null}
                        <HStack
                          justify="space-between"
                          align="center"
                          gap={10}
                          style={{ paddingVertical: 6 }}
                        >
                          <VStack gap={2} flex={1}>
                            <Text variant="label">Grade {grade}</Text>
                            <Text variant="caption" tone="tertiary">
                              {[...new Set(g.subjects)].sort().join(", ")}
                            </Text>
                          </VStack>
                          <Text variant="caption" tone="tertiary" numeric>
                            {count(g.chapters)} chapters · {count(g.topics)}{" "}
                            topics
                          </Text>
                        </HStack>
                      </View>
                    );
                  })}
                </VStack>
              </Card>
            );
          })}
      </VStack>
    </Screen>
  );
}
