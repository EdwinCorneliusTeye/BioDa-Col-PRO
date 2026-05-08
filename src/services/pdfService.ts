import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Observation } from "../types";

export async function generateSummaryPDF(observations: Observation[]) {
  const doc = new jsPDF();
  const primaryColor = [16, 185, 129]; // Emerald 500

  // Title Page
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 60, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Image Analysis", 20, 35);
  
  doc.setFontSize(12);
  doc.text("Consolidated Field Intelligence & AI Analysis", 20, 48);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 48);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.text("Executive Summary", 20, 80);

  const summaryData = [
    ["Total Records", observations.length.toString()],
    ["Flora Specimens", observations.filter(o => o.type === "plant").length.toString()],
    ["Fauna Specimens", observations.filter(o => o.type === "animal").length.toString()],
    ["Analyzed via AI", observations.filter(o => o.speciesSuggestions && o.speciesSuggestions.length > 0).length.toString()]
  ];

  autoTable(doc, {
    startY: 85,
    body: summaryData,
    theme: 'striped',
    styles: { fontSize: 11, cellPadding: 5 }
  });

  // Main Findings Table
  doc.setFontSize(16);
  doc.text("Identification Log", 20, (doc as any).lastAutoTable.finalY + 20);

  const tableData = observations.map(obs => [
    new Date(obs.timestamp?.toDate ? obs.timestamp.toDate() : obs.timestamp).toLocaleDateString(),
    obs.type.toUpperCase(),
    obs.selectedSpecies?.species || "Unidentified",
    obs.speciesSuggestions && obs.speciesSuggestions.length > 0 
      ? `${(obs.speciesSuggestions[0].confidence * 100).toFixed(0)}%` 
      : "N/A",
    obs.researcherName || "Anon"
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 25,
    head: [["Date", "Type", "Identification", "Confidence", "Researcher"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor as [number, number, number] }
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`BioDa-Col Ecosystem Analysis - Page ${i} of ${pageCount}`, 20, 285);
  }

  doc.save(`Image_Analysis_Export_${Date.now()}.pdf`);
}

export async function generateObservationPDF(observation: Observation) {
  const doc = new jsPDF();
  const primaryColor = [16, 185, 129]; // Emerald 500

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Image Analysis Report", 20, 25);
  
  doc.setFontSize(10);
  doc.text(`ID: ${observation.id}`, 20, 33);
  doc.text(`DATE: ${new Date(observation.timestamp?.toDate ? observation.timestamp.toDate() : observation.timestamp).toLocaleString()}`, 140, 33);

  // Content
  doc.setTextColor(40, 40, 40);
  
  // Add Image if exists
  if (observation.imageUrl) {
    try {
      // Add a border for the image
      doc.setDrawColor(200);
      doc.rect(140, 45, 50, 50);
      doc.addImage(observation.imageUrl, 'JPEG', 142, 47, 46, 46);
    } catch (e) {
      console.error("Could not add image to PDF", e);
    }
  }

  doc.setFontSize(14);
  doc.text("Observation Details", 20, 55);

  const basicData = [
    ["Category", observation.type.toUpperCase()],
    ["Researcher", observation.researcherName || "Anonymous"],
    ["Species", observation.selectedSpecies?.species || "Unidentified"],
    ["Family", observation.selectedSpecies?.family || "Unknown"]
  ];

  autoTable(doc, {
    startY: 60,
    head: [["Attribute", "Value"]],
    body: basicData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor as [number, number, number] }
  });

  // AI Suggestions
  if (observation.speciesSuggestions && observation.speciesSuggestions.length > 0) {
    doc.setFontSize(14);
    doc.text("AI Taxonomy Analysis", 20, (doc as any).lastAutoTable.finalY + 15);
    
    const aiData = observation.speciesSuggestions.map(s => [
      s.family,
      (s as any).genus || "N/A",
      s.species,
      `${(s.confidence * 100).toFixed(1)}%`,
      s.description || ""
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Family", "Genus", "Species", "Confidence", "Description"]],
      body: aiData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: {
        4: { cellWidth: 50 } // Give more space for description
      }
    });
  }

  // Variables
  doc.setFontSize(14);
  doc.text("Parametric Data", 20, (doc as any).lastAutoTable.finalY + 15);
  
  const variableData = Object.entries(observation.variables).map(([key, val]) => [key, val]);
  observation.customVariables.forEach(cv => {
    if (cv.value !== undefined) variableData.push([cv.name, cv.value]);
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Parameter", "Observation Value"]],
    body: variableData,
    theme: 'plain',
    headStyles: { fillColor: [100, 116, 139] }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Ecosystem Intelligence Platform - Page ${i} of ${pageCount}`, 20, 285);
  }

  doc.save(`Observation_${observation.id}.pdf`);
}
