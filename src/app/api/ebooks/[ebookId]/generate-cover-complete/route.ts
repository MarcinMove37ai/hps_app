// src/app/api/ebooks/[ebookId]/generate-cover-complete/route.ts

import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client;

  try {
    const resolvedParams = await params;
    const ebookId = resolvedParams.ebookId;
    const ebookIdNum = parseInt(ebookId);

    if (isNaN(ebookIdNum)) {
      return NextResponse.json({ error: 'Nieprawidłowy identyfikator ebooka' }, { status: 400 });
    }

    const {
      forceRegenerate = false,
      generatePdf = false,
      coverSize = '1024x1024'  // 🔥 Zmienione na kwadratowy z marginesami
    } = await request.json();

    console.log(`🎨 === COMPLETE BOOK COVER PROCESS START ===`);
    console.log(`   - Ebook ID: ${ebookIdNum}`);
    console.log(`   - Force regenerate: ${forceRegenerate}`);
    console.log(`   - Generate PDF: ${generatePdf}`);
    console.log(`   - Cover format: ${coverSize} (square with margins optimized)`);
    console.log(`   - Background: transparent (seamless composition)`);
    console.log(`   - Quality: high (premium rendering)`);
    console.log(`   - Timestamp: ${new Date().toISOString()}`);

    // Database connection
    client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // KROK 1: Verify ebook exists and get details
    const ebookQuery = `
      SELECT id, title, subtitle, cover_image_url, cover_image_prompt
      FROM ebooks WHERE id = $1
    `;
    const ebookResult = await client.query(ebookQuery, [ebookIdNum]);

    if (ebookResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook nie został znaleziony' }, { status: 404 });
    }

    const ebook = ebookResult.rows[0];
    let stepResults = {
      ebook_id: ebookIdNum,
      ebook_title: ebook.title,
      ebook_subtitle: ebook.subtitle,
      steps_completed: [] as string[],
      cover_prompt_generated: false,
      cover_image_generated: false,
      pdf_generated: false,
      final_cover_url: ebook.cover_image_url,
      final_prompt: ebook.cover_image_prompt,
      cover_format: coverSize,
      background_type: 'transparent',
      composition_type: 'seamless-edge-free-with-margins',
      model_used: null as string | null,
      generation_metrics: null as any,
      errors: [] as string[],
      process_start_time: Date.now(),
      supplement_compliant: false,
      quality_level: 'high'
    };

    console.log(`📖 Processing cover for: "${ebook.title}" ${ebook.subtitle ? `- "${ebook.subtitle}"` : ''}`);

    // KROK 2: Generate professional book cover (prompt + image) with GPT-Image-1
    try {
      console.log(`🎨 === GENERATING PROFESSIONAL BOOK COVER WITH MARGINS ===`);
      console.log(`   - Target format: ${coverSize} (square book cover with proper margins)`);
      console.log(`   - Using GPT-Image-1 high quality pipeline`);
      console.log(`   - Background: transparent (seamless composition)`);
      console.log(`   - Content safety: full supplement restrictions`);
      console.log(`   - Composition: edge-free with internal spacing`);

      const coverResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ebooks/${ebookId}/generate-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRegenerate,
          size: coverSize  // 🔥 Pass square format with margins
        })
      });

      if (!coverResponse.ok) {
        const errorData = await coverResponse.json();
        throw new Error(`Cover generation failed: ${errorData.error}`);
      }

      const coverData = await coverResponse.json();
      stepResults.steps_completed.push('professional_cover_with_margins_generated');
      stepResults.cover_prompt_generated = coverData.prompt_was_generated;
      stepResults.cover_image_generated = true;
      stepResults.final_cover_url = coverData.cover_image_url;
      stepResults.final_prompt = coverData.prompt_used;
      stepResults.model_used = coverData.generation_metrics?.model_used || 'unknown';
      stepResults.generation_metrics = coverData.generation_metrics;
      stepResults.supplement_compliant = coverData.content_compliance?.supplement_safe || false;

      console.log(`✅ Professional book cover with margins generated successfully:`);
      console.log(`   - URL: ${coverData.cover_image_url}`);
      console.log(`   - Model: ${coverData.generation_metrics?.model_used || 'unknown'}`);
      console.log(`   - Format: ${coverData.generation_metrics?.cover_format || coverSize}`);
      console.log(`   - Background: ${coverData.generation_metrics?.background_type || 'transparent'}`);
      console.log(`   - Composition: ${coverData.generation_metrics?.composition_type || 'seamless'}`);
      console.log(`   - Margins: ${coverData.generation_metrics?.margin_control || 'proper-spacing'}`);
      console.log(`   - Cost: $${coverData.generation_metrics?.cost_estimate || '0'}`);
      console.log(`   - Prompt length: ${coverData.generation_metrics?.prompt_length || 0} chars`);
      console.log(`   - Quality: ${coverData.generation_metrics?.quality_setting || 'high'}`);
      console.log(`   - Supplement compliant: ${stepResults.supplement_compliant ? '✅' : '❌'}`);
      console.log(`   - Cache bust URL: ${coverData.cache_bust_url || 'N/A'}`);

    } catch (error: any) {
      stepResults.errors.push(`Book cover generation error: ${error.message}`);
      console.error('❌ Book cover generation failed:', error);
    }

    // KROK 3: Generate PDF with cover (optional)
    if (generatePdf && stepResults.cover_image_generated) {
      try {
        console.log(`📄 === GENERATING PDF WITH MARGIN-OPTIMIZED COVER ===`);
        console.log(`   - Including professional book cover with proper margins`);
        console.log(`   - Cover format: ${stepResults.cover_format}`);
        console.log(`   - Background: ${stepResults.background_type}`);
        console.log(`   - Composition: ${stepResults.composition_type}`);

        const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ebooks/${ebookId}/export-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includeCover: true,
            coverFormat: stepResults.cover_format,
            coverBackground: stepResults.background_type,
            coverComposition: stepResults.composition_type
          })
        });

        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          stepResults.steps_completed.push('pdf_with_margin_cover_generated');
          stepResults.pdf_generated = true;
          console.log(`✅ PDF with professional margin-optimized cover generated`);
          console.log(`   - PDF URL: ${pdfData.pdf_url || 'Generated successfully'}`);
        } else {
          throw new Error('PDF generation failed');
        }

      } catch (error: any) {
        stepResults.errors.push(`PDF generation error: ${error.message}`);
        console.error('❌ PDF generation failed:', error);
      }
    } else if (generatePdf) {
      stepResults.errors.push('PDF generation skipped - cover generation failed');
      console.warn('⚠️ PDF generation skipped due to cover generation failure');
    }

    // KROK 4: Final validation and comprehensive metrics
    const processingTime = Date.now() - stepResults.process_start_time;
    const success = stepResults.errors.length === 0;
    const qualityScore = stepResults.generation_metrics?.quality_setting === 'high' ? 100 : 75;

    console.log(`📊 === COMPLETE COVER PROCESS SUMMARY ===`);
    console.log(`   - Ebook: "${stepResults.ebook_title}"`);
    console.log(`   - Total processing time: ${processingTime}ms`);
    console.log(`   - Steps completed: ${stepResults.steps_completed.join(', ')}`);
    console.log(`   - Errors: ${stepResults.errors.length}`);
    console.log(`   - Cover generated: ${stepResults.cover_image_generated ? '✅' : '❌'}`);
    console.log(`   - PDF generated: ${stepResults.pdf_generated ? '✅' : '❌'}`);
    console.log(`   - Model used: ${stepResults.model_used || 'N/A'}`);
    console.log(`   - Format: ${stepResults.cover_format} (${stepResults.background_type})`);
    console.log(`   - Composition: ${stepResults.composition_type}`);
    console.log(`   - Quality level: ${stepResults.quality_level}`);
    console.log(`   - Quality score: ${qualityScore}%`);
    console.log(`   - Supplement compliance: ${stepResults.supplement_compliant ? '✅' : '❌'}`);
    console.log(`   - Final cover URL: ${stepResults.final_cover_url || 'N/A'}`);
    console.log(`   - Success: ${success ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`📊 === END PROCESS SUMMARY ===`);

    // Enhanced response with detailed metrics and stable URLs
    return NextResponse.json({
      success: success,
      message: success
        ? 'Professional book cover with margins completed successfully'
        : 'Cover process completed with errors',
      results: {
        ...stepResults,
        processing_time_ms: processingTime,
        success_rate: stepResults.steps_completed.length / (stepResults.steps_completed.length + stepResults.errors.length),
        cover_quality: stepResults.generation_metrics?.optimization_level || 'unknown',
        quality_score: qualityScore,
        cover_specs: {
          format: stepResults.cover_format,
          background: stepResults.background_type,
          composition: stepResults.composition_type,
          model: stepResults.model_used,
          quality_level: stepResults.quality_level,
          cost_estimate: stepResults.generation_metrics?.cost_estimate || 0,
          prompt_utilization: stepResults.generation_metrics?.prompt_utilization || '0%',
          supplement_compliant: stepResults.supplement_compliant,
          margins_applied: true,
          edge_clearance: true,
          white_background_compatible: true
        }
      },
      cover_url: stepResults.final_cover_url,
      // URL bez cache busting - zostanie dodany w komponencie React
      cover_url_with_cache_bust: stepResults.final_cover_url,
      cover_prompt: stepResults.final_prompt,
      generation_metrics: stepResults.generation_metrics,
      // Timestamp dla frontend bez cache control
      generation_timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('❌ === CRITICAL COVER PROCESS ERROR ===');
    console.error(`   - Error: ${error.message}`);
    console.error(`   - Type: ${error.constructor.name}`);

    return NextResponse.json({
      success: false,
      error: 'Critical error during book cover with margins process',
      details: error.message,
      timestamp: new Date().toISOString(),
      format_attempted: '1024x1024-transparent-seamless-margins'
    }, { status: 500 });

  } finally {
    if (client) {
      await client.end();
      console.log('🔐 Database connection closed');
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  // Enhanced endpoint for checking book cover status with margin specifications
  let client;

  try {
    const resolvedParams = await params;
    const ebookId = resolvedParams.ebookId;
    const ebookIdNum = parseInt(ebookId);

    if (isNaN(ebookIdNum)) {
      return NextResponse.json({ error: 'Invalid ebook identifier' }, { status: 400 });
    }

    console.log(`📊 Checking margin-optimized cover status for ebook ${ebookIdNum}`);

    client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Enhanced status query with chapter count
    const statusQuery = `
      SELECT
        e.id, e.title, e.subtitle,
        e.cover_image_url, e.cover_image_prompt,
        e.created_at, e.updated_at,
        COUNT(c.id) as chapter_count
      FROM ebooks e
      LEFT JOIN ebook_chapters c ON e.id = c.ebook_id
      WHERE e.id = $1
      GROUP BY e.id, e.title, e.subtitle, e.cover_image_url, e.cover_image_prompt, e.created_at, e.updated_at
    `;

    const result = await client.query(statusQuery, [ebookIdNum]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    const ebook = result.rows[0];

    // Analyze cover readiness with margin specifications
    const coverAnalysis = {
      prompt_ready: !!ebook.cover_image_prompt,
      image_ready: !!ebook.cover_image_url,
      complete: !!(ebook.cover_image_prompt && ebook.cover_image_url),
      prompt_length: ebook.cover_image_prompt?.length || 0,
      chapters_available: ebook.chapter_count > 0,
      ready_for_generation: ebook.chapter_count > 0,
      estimated_quality: ebook.cover_image_prompt?.length > 3000 ? 'premium' :
                        ebook.cover_image_prompt?.length > 2000 ? 'high' :
                        ebook.cover_image_prompt?.length > 1000 ? 'medium' : 'basic',
      has_margin_optimization: ebook.cover_image_prompt?.toLowerCase().includes('margin') ||
                               ebook.cover_image_prompt?.toLowerCase().includes('spacing'),
      has_supplement_restrictions: ebook.cover_image_prompt?.toLowerCase().includes('forbidden') ||
                                   ebook.cover_image_prompt?.toLowerCase().includes('prohibited'),
      format_compliance: ebook.cover_image_prompt?.includes('1024x1024') ? 'square' : 'unknown'
    };

    console.log(`📊 Margin-optimized cover status analysis:`);
    console.log(`   - Prompt ready: ${coverAnalysis.prompt_ready}`);
    console.log(`   - Image ready: ${coverAnalysis.image_ready}`);
    console.log(`   - Complete: ${coverAnalysis.complete}`);
    console.log(`   - Chapters: ${ebook.chapter_count}`);
    console.log(`   - Quality estimate: ${coverAnalysis.estimated_quality}`);
    console.log(`   - Margin optimization: ${coverAnalysis.has_margin_optimization}`);
    console.log(`   - Supplement restrictions: ${coverAnalysis.has_supplement_restrictions}`);
    console.log(`   - Format compliance: ${coverAnalysis.format_compliance}`);

    return NextResponse.json({
      ebook_id: ebook.id,
      title: ebook.title,
      subtitle: ebook.subtitle,
      chapter_count: parseInt(ebook.chapter_count),
      cover_status: coverAnalysis,
      cover_details: {
        url: ebook.cover_image_url,
        // URL bez cache busting - zostanie dodany w komponencie React
        url_with_cache_bust: ebook.cover_image_url,
        prompt: ebook.cover_image_prompt,
        prompt_length: coverAnalysis.prompt_length,
        last_updated: ebook.updated_at,
        format_detected: coverAnalysis.format_compliance,
        margin_optimized: coverAnalysis.has_margin_optimization,
        supplement_safe: coverAnalysis.has_supplement_restrictions
      },
      recommendations: {
        can_generate_cover: coverAnalysis.ready_for_generation,
        should_regenerate: !coverAnalysis.complete ||
                          coverAnalysis.estimated_quality === 'basic' ||
                          !coverAnalysis.has_margin_optimization ||
                          !coverAnalysis.has_supplement_restrictions,
        optimal_format: '1024x1024',
        background_type: 'transparent',
        composition_type: 'seamless-edge-free-with-margins',
        expected_model: 'gpt-image-1',
        quality_level: 'high',
        upgrade_reasons: [
          ...(coverAnalysis.estimated_quality === 'basic' ? ['Low quality prompt'] : []),
          ...(!coverAnalysis.has_margin_optimization ? ['Missing margin optimization'] : []),
          ...(!coverAnalysis.has_supplement_restrictions ? ['Missing supplement restrictions'] : []),
          ...(coverAnalysis.format_compliance !== 'square' ? ['Non-optimal format'] : [])
        ]
      },
      timestamps: {
        created: ebook.created_at,
        last_updated: ebook.updated_at,
        status_checked: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Cover status check failed:', error);
    return NextResponse.json({
      error: 'Failed to check cover status',
      details: error.message
    }, { status: 500 });

  } finally {
    if (client) {
      await client.end();
    }
  }
}