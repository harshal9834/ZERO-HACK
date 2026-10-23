import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import * as agent from './server/agent.js';
import * as mockInsurer from './server/mockInsurer.js';
import { runAllTests } from './server/testsRunner.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. System status
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      geminiConfigured: agent.isGeminiEnabled(),
      timestamp: new Date().toISOString(),
      policyCount: db.getPolicies().length,
      actionsCount: db.getActions().length,
      alertsCount: db.getAlerts().filter(a => !a.dismissed).length,
    });
  });

  // 1b. Agent Tools Declarations
  app.get('/api/agent/tools', (_req: Request, res: Response) => {
    res.json({
      tools: agent.AGENT_TOOLS,
      count: agent.AGENT_TOOLS.length,
    });
  });

  // 1c. Alerts for Renewal Calendar
  app.get('/api/alerts', (_req: Request, res: Response) => {
    res.json(db.getAlerts());
  });

  app.post('/api/alerts/:id/dismiss', (req: Request, res: Response) => {
    const alertId = parseInt(req.params.id, 10);
    const dismissed = db.dismissAlert(alertId);
    res.json({ success: dismissed });
  });

  // 1d. Autonomous Agent Workflow Execution
  app.post('/api/agent/run', async (req: Request, res: Response) => {
    try {
      const { policyId, autoApproveSimulation, skipAi } = req.body || {};
      const results = await agent.runAutonomousWorkflow(db, policyId, {
        autoApproveSimulation: Boolean(autoApproveSimulation),
        skipAi: skipAi !== undefined ? Boolean(skipAi) : true,
      });
      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Mock Insurer Page endpoint (HTML representation for live scraper & iframe inspection)
  app.get('/insurer/:policyNo', (req: Request, res: Response) => {
    const policyNo = req.params.policyNo;
    const quote = mockInsurer.getMockQuote(policyNo);
    if (!quote) {
      res.status(404).send(`<html><body><h2>404 - Policy Not Found in Mock Portal</h2></body></html>`);
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(mockInsurer.renderMockPageHtml(policyNo, quote));
  });

  // 3. Mock Insurer JSON endpoints
  app.get('/api/mock/:policyNo', (req: Request, res: Response) => {
    const quote = mockInsurer.getMockQuote(req.params.policyNo);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found for policy' });
      return;
    }
    res.json(quote);
  });

  app.post('/api/mock/:policyNo', (req: Request, res: Response) => {
    try {
      const { insurer, product, cover, premium, ncb } = req.body || {};
      let formattedNcb: string | null = null;
      if (ncb !== null && ncb !== undefined) {
        const clean = String(ncb).trim();
        if (clean !== '' && clean !== '-' && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'none') {
          formattedNcb = clean.endsWith('%') ? clean : `${clean}%`;
        }
      }

      mockInsurer.setMockQuote(req.params.policyNo, {
        insurer: insurer || 'Acme Motor',
        product: product || 'Standard Policy Cover',
        cover: Number(cover) || 500000,
        premium: Number(premium) || 10000,
        ncb: formattedNcb,
      });
      res.json({ success: true, quote: mockInsurer.getMockQuote(req.params.policyNo) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Policy Renewal Data
  app.get('/api/policies', (_req: Request, res: Response) => {
    const policies = db.getPolicies();
    const today = new Date();

    const data = policies.map((p) => {
      const q = db.getLatestQuoteForPolicy(p.id);
      const a = db.getLatestActionForPolicy(p.id);
      const trace = db.getTracesForPolicy(p.id);
      const alerts = db.getAlerts().filter((alt) => alt.policy_id === p.id && !alt.dismissed);

      const dExpiry = new Date(p.expiry);
      const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffDays = Math.round((dExpiry.getTime() - dToday.getTime()) / (1000 * 60 * 60 * 24));

      return {
        policy: p,
        days: diffDays,
        quote: q || null,
        action: a || null,
        trace,
        alerts,
      };
    });

    res.json(data);
  });

  // 5. Propose All policies
  app.post('/api/policies/propose_all', (_req: Request, res: Response) => {
    const policies = db.getPolicies();
    const today = new Date();
    const results = [];
    for (const p of policies) {
      const actionId = agent.propose(db, p.id, today);
      results.push({ policyId: p.id, actionId });
    }
    res.json({ success: true, results });
  });

  // 6. Propose a single policy
  app.post('/api/policies/:id/propose', (req: Request, res: Response) => {
    const policyId = parseInt(req.params.id, 10);
    try {
      const actionId = agent.propose(db, policyId, new Date());
      res.json({ success: true, actionId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 7. Human Approve action
  app.post('/api/actions/:id/approve', async (req: Request, res: Response) => {
    const actionId = parseInt(req.params.id, 10);
    try {
      const result = await agent.approve(db, actionId, new Date());
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Human Reject action
  app.post('/api/actions/:id/reject', (req: Request, res: Response) => {
    const actionId = parseInt(req.params.id, 10);
    const rejected = agent.reject(db, actionId);
    res.json({ success: rejected });
  });

  // 9. Manual Re-Verify
  app.post('/api/actions/:id/verify', (req: Request, res: Response) => {
    const actionId = parseInt(req.params.id, 10);
    const result = agent.verify(db, actionId);
    if (!result) {
      res.status(400).json({ error: 'Cannot verify: action not completed or quote missing' });
      return;
    }
    res.json({ success: true, result });
  });

  // 10. Add new policy
  // 10. Add or update policy (idempotent; prevents duplicates on retry/correct)
  app.post('/api/policies', (req: Request, res: Response) => {
    try {
      const { holder, kind, insurer, policy_no, expiry, last_cover, last_ncb, mock_cover, mock_premium, mock_ncb } = req.body || {};
      if (!policy_no || !String(policy_no).trim()) {
        res.status(400).json({ error: 'policy_no is required' });
        return;
      }
      if (!expiry || !String(expiry).trim()) {
        res.status(400).json({ error: 'expiry is required' });
        return;
      }

      const cleanPolicyNo = String(policy_no).trim().toUpperCase();

      // Upsert policy to prevent duplicate policies when retrying or correcting
      const { policy: p, isNew } = db.upsertPolicy({
        holder: holder || 'Sharma family',
        kind: kind || 'Car',
        insurer: insurer || 'Acme Motor',
        policy_no: cleanPolicyNo,
        expiry: String(expiry).trim(),
        last_cover: Number(last_cover) || 500000,
        last_ncb: last_ncb !== undefined && last_ncb !== null && last_ncb !== '' ? Number(last_ncb) : 0,
      });

      // Safely parse and format mock NCB without crashing on blank/null/undefined
      let formattedNcb: string | null = null;
      if (mock_ncb !== null && mock_ncb !== undefined) {
        const clean = String(mock_ncb).trim();
        if (clean !== '' && clean !== '-' && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'none') {
          formattedNcb = clean.endsWith('%') ? clean : `${clean}%`;
        }
      }

      // Also register/update mock quote for this policy
      mockInsurer.setMockQuote(cleanPolicyNo, {
        insurer: insurer || 'Acme Motor',
        product: `${kind || 'General'} protection plan`,
        cover: Number(mock_cover !== undefined && mock_cover !== '' ? mock_cover : (last_cover || 500000)),
        premium: Number(mock_premium) || 12000,
        ncb: formattedNcb,
      });

      res.json({ success: true, policy: p, isNew });
    } catch (err: any) {
      console.error('Error in POST /api/policies:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // 11. Reset database to default synthetic Sharma family policies
  app.post('/api/policies/reset', (_req: Request, res: Response) => {
    db.seed();
    res.json({ success: true, message: 'Database reset to initial synthetic demo state' });
  });

  // 12. Run automated test suite
  app.get('/api/tests/run', async (req: Request, res: Response) => {
    try {
      const withAi = req.query.withAi === 'true';
      const results = await runAllTests(new Date(), !withAi);
      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite development vs production middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
