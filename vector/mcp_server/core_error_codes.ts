/**
 * VECTOR Error Codes and Structured Error Handling
 * 
 * Provides standardized error codes and MCP-compliant error responses
 * for all tool invocations across the VECTOR runtime.
 */

export type VectorErrorCode =
  | "PHASE_GUARD_FAILED"
  | "PHASE_TRANSITION_ILLEGAL"
  | "PHASE_PREREQUISITES_FAILED"
  | "TOOL_POLICY_MISSING"
  | "CAPABILITY_POLICY_MISSING"
  | "SAFE_MODE_BLOCKED"
  | "PROMPT_INJECTION_DETECTED"
  | "INPUT_TOO_LONG"
  | "INPUT_TOO_DEEP"
  | "INPUT_ARRAY_TOO_LARGE"
  | "COPY_PREREQUISITES_FAILED"
  | "STATE_DRIFT_DETECTED"
  | "RESEARCH_PROVIDER_NOT_CONFIGURED"
  | "RESEARCH_PROVIDER_TIMEOUT"
  | "RESEARCH_PROVIDER_ERROR"
  | "STATE_FILE_CORRUPT"
  | "GRAPH_FILE_CORRUPT"
  | "BACKUP_FILE_CORRUPT"
  | "UNKNOWN_ERROR";

/**
 * Standardized error class with code and context
 */
export class VectorError extends Error {
  constructor(
    public readonly code: VectorErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "VectorError";
  }
}

/**
 * MCP-compliant tool error response
 * Returns isError: true with structured JSON content
 */
export function toolError(
  code: VectorErrorCode,
  message: string,
  context?: Record<string, unknown>
): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({ error: true, code, message, ...(context ?? {}) }),
    }],
  };
}

/**
 * Convert any error to a VectorError
 */
export function toVectorError(error: unknown): VectorError {
  if (error instanceof VectorError) {
    return error;
  }
  if (error instanceof Error) {
    return new VectorError("UNKNOWN_ERROR", error.message);
  }
  return new VectorError("UNKNOWN_ERROR", String(error));
}
