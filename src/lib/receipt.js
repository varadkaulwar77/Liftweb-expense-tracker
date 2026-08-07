// ============================================================
// FINAL RECEIPT — given to the customer once the order is fully
// paid and delivered. This file contains ONLY the receipt layout.
// See invoice.js for the separate Advance Invoice.
// ============================================================
import jsPDF from 'jspdf'
import { formatDate } from './format'
import { orderSubtotal } from './calc'
import { INK, MUTED, PURPLE, PURPLE_LIGHT, PANEL, WHITE, LOGO_ASPECT, loadLogoDataUrl, money } from './pdfShared'

export async function buildReceiptPDF({ order, items, client, settings, docNumber, refDocNumber }) {
  const doc = new jsPDF({ unit: 'pt', format: [400, 720] })
  const logoDataUrl = await loadLogoDataUrl()
  const businessName = settings?.business_name || 'LiftWEB Studio'
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  let y = 40

  const logoHeight = 30
  const logoWidth = logoHeight * LOGO_ASPECT
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, y - 6, logoWidth, logoHeight)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text('RECEIPT', pageWidth - margin, y + 12, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PURPLE_LIGHT)
  doc.text(`#${docNumber}`, pageWidth - margin, y + 26, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(formatDate(order.order_date).toUpperCase(), pageWidth - margin, y + 38, { align: 'right' })

  y += 66
  doc.setDrawColor(230, 230, 236)
  doc.line(margin, y, pageWidth - margin, y)
  y += 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PURPLE_LIGHT)
  doc.text('BILL TO', margin, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text(client?.business_name || 'Walk-in Customer', margin, y + 18)

  if (client?.phone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text(client.phone, margin, y + 33)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PURPLE_LIGHT)
  doc.text('PAYMENT MODE', pageWidth - margin, y, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(order.payment_mode || 'Cash', pageWidth - margin, y + 18, { align: 'right' })

  y += 56

  const itemLabel = items[0]?.product_name || 'Order'
  const displayItem = items.length > 1 ? `${itemLabel} +${items.length - 1} more` : itemLabel

  doc.setFillColor(...PURPLE)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 44, 10, 10, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...WHITE)
  doc.text('ITEM', margin + 16, y + 17)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(displayItem, margin + 16, y + 33, { maxWidth: pageWidth - margin * 2 - 140 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('TYPE', pageWidth - margin - 16, y + 17, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Regular', pageWidth - margin - 16, y + 33, { align: 'right' })

  y += 74

  const colWidth = (pageWidth - margin * 2) / 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PURPLE_LIGHT)
  doc.text('DATE', margin, y)
  doc.text('PAYMENT FOR', margin + colWidth, y)
  doc.text('INVOICE ID', margin + colWidth * 2, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(formatDate(order.order_date), margin, y + 16)

  const paymentForLabel = items.length > 1 ? 'Multiple Products' : items[0]?.product_name || 'Order'
  const paymentForLines = doc.splitTextToSize(paymentForLabel, colWidth - 10)
  doc.text(paymentForLines, margin + colWidth, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const subtitleY = y + 16 + (paymentForLines.length - 1) * 11 + 14
  doc.text('Full Payment', margin + colWidth, subtitleY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  const idLines = doc.splitTextToSize(`#${refDocNumber || docNumber}`, colWidth - 6)
  doc.text(idLines, margin + colWidth * 2, y + 16)

  y += 56
  doc.setDrawColor(230, 230, 236)
  doc.line(margin, y, pageWidth - margin, y)
  y += 26

  const subtotal = orderSubtotal(items)
  const discount = Number(order.discount || 0)
  const grossTotal = subtotal + Number(order.extra_charges || 0)
  const grandTotal = Math.max(grossTotal - discount, 0)
  const advance = Number(order.advance_paid || 0)
  const balancePaid = Number(order.balance_paid || 0)
  const totalPaidSoFar = advance + balancePaid
  const dueBeforeThisPayment = Math.max(grandTotal - advance, 0)

  function amountRow(label, value, opts = {}) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.big ? 13 : 10)
    doc.setTextColor(...(opts.color || MUTED))
    doc.text(label, margin, y)
    doc.setTextColor(...(opts.valueColor || INK))
    doc.text(value, pageWidth - margin, y, { align: 'right' })
    y += opts.big ? 22 : 20
  }

  amountRow('GROSS AMOUNT', money(grossTotal))
  amountRow('DISCOUNT', money(discount))
  amountRow('ADVANCE', money(advance))
  amountRow('DUE AMOUNT', money(dueBeforeThisPayment))
  doc.setDrawColor(230, 230, 236)
  doc.line(margin, y - 8, pageWidth - margin, y - 8)
  y += 6
  amountRow('TOTAL PAID', money(balancePaid), { bold: true, big: true, color: PURPLE_LIGHT, valueColor: PURPLE_LIGHT })
  y += 6

  y += 14

  const panelHeight = 78
  doc.setFillColor(...PANEL)
  doc.roundedRect(margin, y, pageWidth - margin * 2, panelHeight, 12, 12, 'F')

  const iconCx = margin + 34
  const iconCy = y + panelHeight / 2
  doc.setFillColor(...PURPLE)
  doc.circle(iconCx, iconCy, 15, 'F')
  doc.setDrawColor(...WHITE)
  doc.setLineWidth(1.6)
  doc.line(iconCx - 6, iconCy, iconCx - 1, iconCy + 5)
  doc.line(iconCx - 1, iconCy + 5, iconCx + 7, iconCy - 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PURPLE)
  doc.text('PAYMENT RECEIVED!', iconCx + 26, y + 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  const msgLines = doc.splitTextToSize('Thank you! Your payment has been received successfully.', 210)
  doc.text(msgLines, iconCx + 26, y + 40)
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`— ${businessName}`, iconCx + 26, y + 40 + msgLines.length * 11)

  const dividerX = pageWidth - margin - 150
  doc.setDrawColor(220, 218, 230)
  doc.line(dividerX, y + 14, dividerX, y + panelHeight - 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PURPLE_LIGHT)
  doc.text('TOTAL PAID', pageWidth - margin - 14, y + 22, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text(money(totalPaidSoFar), pageWidth - margin - 14, y + 42, { align: 'right' })

  const badgeLabel = totalPaidSoFar >= grandTotal ? 'PAID IN FULL' : 'PARTIALLY PAID'
  doc.setFillColor(...PURPLE)
  const badgeWidth = doc.getTextWidth(badgeLabel) + 20
  doc.roundedRect(pageWidth - margin - 14 - badgeWidth, y + 52, badgeWidth, 18, 9, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...WHITE)
  doc.text(badgeLabel, pageWidth - margin - 14 - badgeWidth / 2, y + 63.5, { align: 'center' })

  y += panelHeight + 30

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(['www.liftwebstudio.in', '@liftwebstudio', businessName].join('   |   '), pageWidth / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text('Build Once. Automate Forever.', pageWidth / 2, y + 16, { align: 'center' })

  return doc
}