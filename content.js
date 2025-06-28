// Content script for AI Overview Analyzer
// This runs automatically on Google search pages

(function() {
    'use strict';
    
    let isAnalyzed = false;
    
    // Auto-detect AI Overview and show notification
    function checkForAIOverview() {
        // Look for AI Overview indicators
        const aiOverviewSelectors = [
            '[data-attrid*="SGE"]',
            '.g-blk',
            '[jsname]',
            '.related-question-pair'
        ];
        
        const hasAIOverview = aiOverviewSelectors.some(selector => 
            document.querySelector(selector)
        );
        
        if (hasAIOverview && !isAnalyzed) {
            showAnalyzeNotification();
        }
    }
    
    function showAnalyzeNotification() {
        // Create floating notification
        const notification = document.createElement('div');
        notification.id = 'ai-analyzer-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                max-width: 300px;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 18px; margin-right: 8px;">🎯</span>
                    <strong>AI Overview Detected!</strong>
                </div>
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 10px;">
                    Click to analyze content opportunities
                </div>
                <div style="text-align: center;">
                    <button id="quickAnalyze" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Quick Analyze</button>
                    <button id="dismissNotification" style="
                        background: none;
                        border: none;
                        color: rgba(255,255,255,0.7);
                        margin-left: 10px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Dismiss</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add event listeners
        document.getElementById('quickAnalyze').addEventListener('click', quickAnalyze);
        document.getElementById('dismissNotification').addEventListener('click', function() {
            notification.remove();
            isAnalyzed = true;
        });
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (document.getElementById('ai-analyzer-notification')) {
                notification.remove();
            }
        }, 10000);
    }
    
    function quickAnalyze() {
        // Remove notification
        const notification = document.getElementById('ai-analyzer-notification');
        if (notification) {
            notification.remove();
        }
        
        // Run quick analysis and show results inline
        try {
            const questions = findQuestionsOnPage();
            if (questions.length > 0) {
                displayInlineResults(questions);
                isAnalyzed = true;
            } else {
                showMessage('No questions found in AI Overview', 'warning');
            }
        } catch (error) {
            console.error('Quick analyze error:', error);
            showMessage('Analysis failed. Try using the extension popup.', 'error');
        }
    }
    
    function findQuestionsOnPage() {
        const questions = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.includes('?') && text.length > 15 && text.length < 300) {
                const questionPatterns = [
                    /^(what|how|why|when|where|who|which|can|do|does|is|are|will|would|should|could)\s+/i,
                    /\?\s*$/
                ];
                
                if (questionPatterns.some(pattern => pattern.test(text))) {
                    if (!questions.find(q => q.text === text)) {
                        questions.push({
                            text: text,
                            element: el,
                            score: scoreQuestion(text)
                        });
                    }
                }
            }
        });
        
        return questions.sort((a, b) => b.score.score - a.score.score);
    }
    
    function scoreQuestion(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('what is') || lower.includes('define') || lower.includes('who is')) {
            return { score: 9, color: '#22c55e', reason: 'Easy - Factual' };
        }
        if (lower.includes('how to') || lower.includes('steps') || lower.includes('guide')) {
            return { score: 6, color: '#f59e0b', reason: 'Medium - How-to' };
        }
        if (lower.includes('why') || lower.includes('analyze') || lower.includes('should')) {
            return { score: 3, color: '#ef4444', reason: 'Hard - Analysis' };
        }
        if (lower.includes('best') || lower.includes('better') || lower.includes('recommend')) {
            return { score: 1, color: '#dc2626', reason: 'Very Hard - Opinion' };
        }
        
        return { score: 5, color: '#6b7280', reason: 'Standard' };
    }
    
    function displayInlineResults(questions) {
        // Add score badges to questions
        questions.forEach(q => {
            const badge = document.createElement('span');
            badge.style.cssText = `
                display: inline-block;
                background: ${q.score.color};
                color: white;
                padding: 2px 6px;
                margin-left: 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                cursor: help;
            `;
            badge.textContent = `${q.score.score}/10`;
            badge.title = `${q.score.reason} - Score: ${q.score.score}/10`;
            
            if (q.element.parentNode) {
                q.element.appendChild(badge);
            }
        });
        
        // Show summary
        const easyCount = questions.filter(q => q.score.score >= 8).length;
        showMessage(`Found ${questions.length} questions. ${easyCount} are easy wins! Check the colored badges.`, 'success');
    }
    
    function showMessage(text, type) {
        const colors = {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        msg.textContent = text;
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            msg.remove();
        }, 5000);
    }
    
    // Check for AI Overview when page loads and when content changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForAIOverview);
    } else {
        checkForAIOverview();
    }
    
    // Also check when page content changes (for dynamic loading)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0 && !isAnalyzed) {
                setTimeout(checkForAIOverview, 1000);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
})();