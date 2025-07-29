// .github/actions/grafana-annotate/post.js
const core = require('@actions/core');
const { getCurrentTimeMs, makeGrafanaApiRequest } = require('./utils');

/**
 * The post function that runs after all job steps.
 * It retrieves the saved annotation ID and updates the annotation with the end time.
 */
async function post() {
    try {
        const annotationId = core.getState('annotation_id');
        const startTimeMs = core.getState('start_time_ms');
        const grafanaUrl = core.getState('grafana_url');
        const grafanaApiKey = core.getState('grafana_api_key');
        const dashboardId = core.getState('dashboard_id');
        const panelId = core.getState('panel_id');
        const message = core.getState('message');
        const tags = core.getState('tags');
        const commitSha = core.getState('commit_sha');
        const runId = core.getState('run_id');
        const repository = core.getState('repository');
        const actor = core.getState('actor');

        if (!annotationId) {
            core.info('No annotation ID found in state. Skipping post-deployment update.');
            return;
        }

        const endTimeMs = getCurrentTimeMs();

        // Ensure Grafana URL ends without a slash
        const baseUrl = grafanaUrl.endsWith('/') ? grafanaUrl.slice(0, -1) : grafanaUrl;
        const annotationsApiUrl = `${baseUrl}/api/annotations/${annotationId}`; // Specific endpoint for update

        const updatedAnnotationPayload = {
            time: parseInt(startTimeMs, 10), // Ensure it's a number
            timeEnd: endTimeMs, // Add the end time
            tags: tags.split(',').map(tag => tag.trim()),
            text: `Deployment by ${actor} (repo: ${repository}, run: #${runId}, commit: ${commitSha}): ${message} (Completed)`, // Optional: append 'Completed'
            isRegion: true, // Keep it as a region
        };

        if (dashboardId) {
            updatedAnnotationPayload.dashboardId = parseInt(dashboardId, 10);
            if (panelId) {
                updatedAnnotationPayload.panelId = parseInt(panelId, 10);
            }
        }

        core.info(`Attempting to update Grafana annotation (ID: ${annotationId}) with end time...`);
        core.debug(`Payload: ${JSON.stringify(updatedAnnotationPayload, null, 2)}`);

        const result = await makeGrafanaApiRequest(annotationsApiUrl, 'PUT', updatedAnnotationPayload, grafanaApiKey);

        if (result.success) {
            core.info(`✔ Successfully updated annotation ID: ${annotationId} with end time.`);
        } else {
            core.error(`✖ Failed to update annotation ID: ${annotationId}. HTTP Status: ${result.status}. Response: ${JSON.stringify(result.body)}`);
            // No setFailed here, as it's a post hook and might hide other failures. Just log.
        }

    } catch (error) {
        core.error(`Action failed during post execution: ${error.message}`);
        // No setFailed here
    }
}

// Call the post function
post();
