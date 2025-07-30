const core = require('@actions/core');
const { makeGrafanaApiRequest } = require('./utils');

/**
 * The main function that runs when the action is called.
 * It creates the initial Grafana annotation and saves its ID for the post action.
 */
async function run() {
    try {
        let grafanaUrl = core.getInput('grafana_url', { required: true });
        grafanaUrl = grafanaUrl.endsWith('/') ? grafanaUrl.slice(0, -1) : grafanaUrl;

        const grafanaApiKey = core.getInput('grafana_api_key', { required: true });
        const message = core.getInput('message', { required: true });

        const dashboardId = core.getInput('dashboard_id');
        const panelId = core.getInput('panel_id');
        const tags = core.getInput('tags');

        const annotationsApiUrl = `${grafanaUrl}/api/annotations`;

        const annotationPayload = {
            time:  Date.now(),
            text: message.trim(),
            isRegion: true,
        };

        if (tags) {
            annotationPayload.tags = tags.split("\n").map(tag => tag.trim());
        }


        //@TODO: error if panelId is provided without dashboardId

        if (dashboardId) {
            annotationPayload.dashboardId = parseInt(dashboardId, 10);

            if (panelId) {
                annotationPayload.panelId = parseInt(panelId, 10);
            }
        }

        core.info('Attempting to create Grafana annotation (start time)...');
        core.debug(`Payload: ${JSON.stringify(annotationPayload, null, 2)}`);

        const result = await makeGrafanaApiRequest(annotationsApiUrl, 'POST', annotationPayload, grafanaApiKey);

        if (result.success && result.body && result.body.id) {
            const annotationId = result.body.id;
            core.info(`✔ Successfully created annotation with ID: ${annotationId}`);
            core.setOutput('annotation_id', annotationId);

            core.saveState('annotation_id', annotationId);
            core.saveState('grafana_api_key', grafanaApiKey);
            core.saveState('grafana_url', grafanaUrl);

        } else {
            core.setFailed(`✖ Failed to create Grafana annotation: ${result.body ? JSON.stringify(result.body) : 'No response body'}`);
        }

    } catch (error) {
        core.setFailed(`Action failed during main execution: ${error.message}`);
    }
}

// Call the main function
run();
