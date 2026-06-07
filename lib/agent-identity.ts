/**
 * ERC-8004 Trustless Agent Identity Helper.
 * Formats off-chain agent card JSON data and calculates reputation metrics.
 */

export interface AgentCardData {
  name: string
  description: string
  capabilities: string[]
  developerAddress: string
  endpointUri: string // AI to AI (A2A) / Model Context Protocol (MCP) server endpoint
  model: string
  version: string
}

/**
 * Formats the agent card data into a standardized ERC-8004 JSON metadata string
 */
export function formatAgentCard(data: AgentCardData): string {
  return JSON.stringify({
    schema: "erc-8004",
    name: data.name,
    description: data.description,
    capabilities: data.capabilities,
    properties: {
      developer: data.developerAddress.toLowerCase(),
      mcp_endpoint: data.endpointUri,
      runtime: {
        model: data.model,
        version: data.version
      }
    }
  }, null, 2)
}

/**
 * Calculates a reputation score out of 100 based on historical job executions
 */
export function calculateReputation(totalJobs: number, approvedJobs: number, disputedJobs: number): number {
  if (totalJobs === 0) return 100 // Default to perfect rating for new agents
  
  const successRate = (approvedJobs / totalJobs) * 100
  const penalty = disputedJobs * 15 // Deduct 15 points per dispute
  
  const calculated = Math.round(successRate - penalty)
  return Math.max(40, Math.min(100, calculated)) // Keep rating bound between 40 and 100
}
