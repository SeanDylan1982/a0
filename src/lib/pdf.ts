export async function exportElementToPDF(el: HTMLElement, filename: string) {
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
      // Small delay to allow fonts/images to finish loading for hidden print areas
    ])

    // Ensure computed styles are applied (useful when rendering hidden/offscreen nodes)
    await new Promise((r) => requestAnimationFrame(() => r(null)))

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = await html2canvas(el, {
      scale: 2 * pixelRatio,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (doc) => {
        // Make sure cloned element has white background to avoid transparent to black issues
        const cloned = doc.getElementById(el.id)
        if (cloned) (cloned as HTMLElement).style.background = '#ffffff'
      },
    })

    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Calculate image dimensions to fit page width, keeping aspect ratio
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Render first page
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Additional pages
    while (heightLeft > 0) {
      pdf.addPage()
      position -= pageHeight
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  } catch (err) {
    console.error('PDF export failed', err)
    throw err
  }
}
