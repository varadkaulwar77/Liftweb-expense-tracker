// Central place for every profit / cost / total calculation in the app.
// Keeping these pure functions means Dashboard, Products, and Orders
// all agree on the same numbers.

export function manufacturingCost(product) {
  const {
    stand_cost = 0,
    printing_cost = 0,
    nfc_tag_cost = 0,
    sticker_cost = 0,
    packaging_box_cost = 0,
    other_cost = 0,
  } = product || {}
  return (
    Number(stand_cost) +
    Number(printing_cost) +
    Number(nfc_tag_cost) +
    Number(sticker_cost) +
    Number(packaging_box_cost) +
    Number(other_cost)
  )
}

export function productComponents(product) {
  const components = []
  const seen = new Set()

  function add(itemKey) {
    if (!itemKey || seen.has(itemKey)) return
    seen.add(itemKey)
    components.push(itemKey)
  }

  add(product?.inventory_key)
  if (Number(product?.nfc_tag_cost) > 0) add('nfc_tag')
  if (Number(product?.sticker_cost) > 0) add('sticker')
  if (Number(product?.packaging_box_cost) > 0) add('packaging_box')

  return components
}

export function productProfit(product) {
  const selling = Number(product?.selling_price || 0)
  return selling - manufacturingCost(product)
}

export function productMargin(product) {
  const selling = Number(product?.selling_price || 0)
  if (selling <= 0) return 0
  return (productProfit(product) / selling) * 100
}

export function orderItemSubtotal(item) {
  return Number(item?.unit_price || 0) * Number(item?.quantity || 0)
}

export function orderItemCost(item) {
  return Number(item?.unit_cost || 0) * Number(item?.quantity || 0)
}

export function orderSubtotal(items = []) {
  return items.reduce((sum, item) => sum + orderItemSubtotal(item), 0)
}

export function orderCost(items = []) {
  return items.reduce((sum, item) => sum + orderItemCost(item), 0)
}

export function orderGrandTotal(items = [], extra = 0, discount = 0) {
  return Math.max(orderSubtotal(items) + Number(extra || 0) - Number(discount || 0), 0)
}

export function orderRemaining(items = [], advance = 0, extra = 0, discount = 0) {
  return Math.max(orderGrandTotal(items, extra, discount) - Number(advance || 0), 0)
}

export function orderProfit(items = []) {
  return orderSubtotal(items) - orderCost(items)
}

export function paymentStatus(grandTotal, advance) {
  const total = Number(grandTotal || 0)
  const paid = Number(advance || 0)
  if (paid <= 0) return 'Pending'
  if (paid >= total) return 'Paid'
  return 'Partial'
}

export function inventoryValue(inventory = [], products = []) {
  return inventory.reduce((sum, item) => {
    const product = products.find((p) => p.inventory_key === item.item_key)
    const unitCost = product ? manufacturingCost(product) : 0
    return sum + unitCost * Number(item.quantity || 0)
  }, 0)
}