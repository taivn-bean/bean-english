import { useQueries, useQuery } from '@tanstack/react-query'
import { contentIndexQuery, type Topic, topicQuery } from './content'

/** Load the given topics (or all topics when omitted). Returns only the ones loaded so far. */
export function useTopics(ids?: string[]) {
  const { data: index } = useQuery(contentIndexQuery)
  const wanted = ids ?? index?.topics.map((t) => t.id) ?? []
  const known = wanted.filter((id) => index?.topics.some((t) => t.id === id))
  return useQueries({
    queries: known.map((id) => topicQuery(id)),
    combine: (results) => ({
      topics: results.flatMap((r) => (r.data ? [r.data] : [])) as Topic[],
      isLoading: !index || results.some((r) => r.isPending),
    }),
  })
}
