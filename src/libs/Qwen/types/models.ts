export const models = {
  max_preview: 'qwen3-max-preview',
  coder_plus: 'qwen3-coder-plus',
  max_latest: 'qwen-max-latest',
  plus_2025_09_11: 'qwen-plus-2025-09-11',
  qwen3_235b_a22b: 'qwen3-235b-a22b',
  _30b_a3b: 'qwen3-30b-a3b',
  coder_30b_a3b_instruct: 'qwen3-coder-30b-a3b-instruct',
  plus_2025_01_25: 'qwen-plus-2025-01-25',
  qwq_32b: 'qwq-32b',
  turbo_2025_02_11: 'qwen-turbo-2025-02-11',
  qwen2_5_omni_7b: 'qwen2.5-omni-7b',
  qvq_72b_preview_0310: 'qvq-72b-preview-0310',
  qwen2_5_vl_32b_instruct: 'qwen2.5-vl-32b-instruct',
  qwen2_5_14b_instruct_1m: 'qwen2.5-14b-instruct-1m',
  qwen2_5_coder_32b_instruct: 'qwen2.5-coder-32b-instruct',
  qwen2_5_72b_instruct: 'qwen2.5-72b-instruct',
} as const

export type Model = typeof models[keyof typeof models]
