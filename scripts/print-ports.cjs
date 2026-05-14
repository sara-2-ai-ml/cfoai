/* eslint-disable no-console */
  console.log(`
================================================================
  CFOai (Next.js)  —  hap në shfletues adresën "Local:" më poshtë
                     (zakonisht http://localhost:3000)

  ChromaDB         —  http://localhost:8000  është VETËM API për
                     vektorë. Në Chrome shpesh del 404 për / —
                     kjo është normale; MOS e përdor si faqe app.

  Pa Chroma të ndezur?  Mbyll këtë proces dhe përdor:
    npm run dev:full
  (Docker + Chroma në :8000, pastaj Next.js)
================================================================
`);
