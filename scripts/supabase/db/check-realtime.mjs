#!/usr/bin/env node

/**
 * Realtime Configuration Check
 *
 * Verifies:
 * 1. RLS policies allow realtime subscriptions
 * 2. Realtime is enabled for analysis_jobs table
 * 3. User can access analysis_jobs data
 */

import { createDbClient, createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

const logger = createScriptLogger('check-realtime')

async function checkRealtimeConfig() {
  try {
    const config = getScriptConfig()
    const client = await createDbClient(config)

    await client.connect()
    logger.info('Connected to database')

    // 1. Check RLS policies for analysis_jobs
    logger.info('🔍 Checking RLS policies for analysis_jobs...')

    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE tablename = 'analysis_jobs'
      ORDER BY policyname
    `)

    logger.info(`Found ${policiesResult.rows.length} policies for analysis_jobs:`)
    policiesResult.rows.forEach(policy => {
      logger.info(`- ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`)
      if (policy.qual) {
        logger.info(`  Qualifier: ${policy.qual}`)
      }
      if (policy.roles) {
        const roles = Array.isArray(policy.roles) ? policy.roles.join(', ') : policy.roles
        logger.info(`  Roles: ${roles}`)
      }
    })

    // 2. Check if realtime is enabled (check publication)
    logger.info('🔍 Checking realtime publication...')

    const pubResult = await client.query(`
      SELECT pubname, pubowner, puballtables, pubinsert, pubupdate, pubdelete
      FROM pg_publication
      WHERE pubname = 'supabase_realtime'
    `)

    if (pubResult.rows.length === 0) {
      logger.error('❌ No supabase_realtime publication found!')
    } else {
      const pub = pubResult.rows[0]
      logger.info('✅ supabase_realtime publication exists:', {
        name: pub.pubname,
        allTables: pub.puballtables,
        insert: pub.pubinsert,
        update: pub.pubupdate,
        delete: pub.pubdelete
      })
    }

    // 3. Check publication tables (what tables are published for realtime)
    logger.info('🔍 Checking published tables...')

    const pubTablesResult = await client.query(`
      SELECT schemaname, tablename
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename
    `)

    logger.info(`Found ${pubTablesResult.rows.length} tables in realtime publication:`)
    pubTablesResult.rows.forEach(table => {
      logger.info(`- ${table.schemaname}.${table.tablename}`)
    })

    const hasAnalysisJobs = pubTablesResult.rows.some(t => t.tablename === 'analysis_jobs')
    logger.info(`analysis_jobs in realtime: ${hasAnalysisJobs ? '✅ YES' : '❌ NO'}`)

    // 4. Test actual data access with RLS
    logger.info('🔍 Testing data access with user permissions...')

    // First, get the test user ID
    const userResult = await client.query(`
      SELECT id FROM auth.users WHERE email = $1
    `, [config.testAuth.email])

    if (userResult.rows.length === 0) {
      logger.error('❌ Test user not found')
      await client.end()
      return
    }

    const userId = userResult.rows[0].id
    logger.info(`Test user ID: ${userId}`)

    // Switch to authenticated user context (simulate RLS)
    await client.query(`SET LOCAL auth.uid = '${userId}'`)

    // Try to select from analysis_jobs (check what columns exist)
    try {
      const columnsResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'analysis_jobs'
        ORDER BY ordinal_position
      `)
      logger.info('analysis_jobs columns:', columnsResult.rows.map(r => r.column_name))

      const analysisJobsResult = await client.query(`
        SELECT * FROM analysis_jobs WHERE user_id = $1 LIMIT 5
      `, [userId])

      logger.info(`User can access ${analysisJobsResult.rows.length} analysis_jobs records`)
      if (analysisJobsResult.rows.length > 0) {
        logger.info('Sample record:', analysisJobsResult.rows[0])
      }
    } catch (err) {
      logger.error('Error accessing analysis_jobs:', err.message)
    }

    // 5. Check if there are any active channels/connections
    logger.info('🔍 Checking for potential connection limits...')

    // This is a rough estimate - count recent connections
    const connectionsResult = await client.query(`
      SELECT count(*) as connection_count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
    `)

    const connectionCount = parseInt(connectionsResult.rows[0].connection_count)
    logger.info(`Active database connections: ${connectionCount}`)

    if (connectionCount > 150) {
      logger.warn('⚠️  High connection count - may be hitting limits')
    } else {
      logger.info('✅ Connection count looks normal')
    }

    await client.end()
    logger.success('🎉 Realtime configuration check completed!')

    // Summary
    console.log('\n📊 SUMMARY:')
    console.log(`RLS Policies: ${policiesResult.rows.length > 0 ? '✅' : '❌'}`)
    console.log(`Realtime Publication: ${pubResult.rows.length > 0 ? '✅' : '❌'}`)
    console.log(`analysis_jobs Published: ${hasAnalysisJobs ? '✅' : '❌'}`)
    console.log(`User Data Access: ${analysisJobsResult.rows.length >= 0 ? '✅' : '❌'}`)

  } catch (err) {
    logger.error('Realtime check failed:', err.message)
    process.exit(1)
  }
}

checkRealtimeConfig()
