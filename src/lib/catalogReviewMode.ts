export function canLoadAtlantaMerchReview(qaFlags: string[], previewOwnerMode: boolean, kaviOperator: boolean) {
  return qaFlags.includes('atlanta-merch-review') && previewOwnerMode && kaviOperator
}
