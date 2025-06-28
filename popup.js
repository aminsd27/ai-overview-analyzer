// Popup script for AI Overview Analyzer Extension

document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const results = document.getElementById('results');
    const status = document.getElementById('status');
    const summary = document.getElementById('summary');
    const questionList = document.getElementById('questionList');
    const exportBtn = document.getElementById('exportBtn');
    
    let currentResults = null;

    analyzeBtn.addEventListener('click', function() {
        analyzeBtn.textContent = '🔄 Analyzing...';
        analyzeBtn.disabled = true;
        
        // Get current tab and inject analysis script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: analyzeAIOverview
            }, function(results) {
                if (results && results[0] && results[0].result) {
                    displayResults(results[0].result);
                } else {
                    showError('No AI Overview questions found on this page');
                }
                
                analyzeBtn.textContent = '🔍 Analyze This Page';
                analyzeBtn.disabled = false;
            });
        });
    });
    
    exportBtn.addEventListener('click', function() {
        if (currentResults) {
            exportResults(currentResults);
        }
    });
    
    function displayResults(data) {
        currentResults = data;
        results.style.display = 'block';
        status.style.display = 'none';
        
        // Create summary
        const avgScore = data.questions.length > 0 ? 
            (data.questions.reduce((sum, q) => sum + q.score, 0) / data.questions.length).toFixed(1) : 0;
        
        const easyCount = data.questions.filter(q => q.score >= 8).length;
        const mediumCount = data.questions.filter(q => q.score >= 5 && q.score < 8).length;
        const hardCount = data.questions.filter(q => q.score < 5).length;
        
        summary.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 20px; font-weight: bold;">${data.questions.length} Questions Found</div>
                <div style="font-size: 16px; margin: 5px 0;">Average Score: ${avgScore}/10</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div style="text-align: center;">
                    <div style="color: #22c55e; font-weight: bold; font-size: 18px;">${easyCount}</div>
                    <div style="font-size: 12px;">Easy</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #f59e0b; font-weight: bold; font-size: 18px;">${mediumCount}</div>
                    <div style="font-size: 12px;">Medium</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #ef4444; font-weight: bold; font-size: 18px;">${hardCount}</div>
                    <div style="font-size: 12px;">Hard</div>
                </div>
            </div>
            
            <div style="font-size: 12px; text-align: center; opacity: 0.8;">
                💡 Focus on the <span style="color: #22c55e; font-weight: bold;">${easyCount} easy questions</span> first!
            </div>
        `;
        
        // Display questions
        questionList.innerHTML = '';
        data.questions.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.style.borderLeftColor = q.color;
            
            const priority = q.score >= 8 ? '🎯 HIGH PRIORITY' : 
                           q.score >= 5 ? '⚡ MEDIUM' : '⚠️ LOW PRIORITY';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 5px;">
                    <strong style="background: ${q.color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                        ${q.score}/10
                    </strong>
                    <span style="margin-left: 8px; font-size: 10px; opacity: 0.8;">${priority}</span>
                </div>
                <div style="margin-bottom: 3px;">${q.text}</div>
                <div style="font-size: 10px; opacity: 0.7;">${q.reason}</div>
            `;
            
            questionList.appendChild(item);
        });
    }
    
    function showError(message) {
        status.textContent = message;
        status.style.color = '#ffcccb';
        results.style.display = 'none';
    }
    
    function exportResults(data) {
        const exportData = {
            timestamp: new Date().toISOString(),
            url: data.url,
            summary: {
                totalQuestions: data.questions.length,
                averageScore: (data.questions.reduce((sum, q) => sum + q.score, 0) / data.questions.length).toFixed(1),
                easyQuestions: data.questions.filter(q => q.score >= 8).length,
                mediumQuestions: data.questions.filter(q => q.score >= 5 && q.score < 8).length,
                hardQuestions: data.questions.filter(q => q.score < 5).length
            },
            questions: data.questions.map(q => ({
                text: q.text,
                score: q.score,
                difficulty: q.reason,
                priority: q.score >= 8 ? 'HIGH' : q.score >= 5 ? 'MEDIUM' : 'LOW'
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `ai-overview-analysis-${new Date().toISOString().split('T')[0]}.json`
        });
    }
});

// Content analysis function (injected into page)
function analyzeAIOverview() {
    const SCORING_CRITERIA = {
        easy: {
            keywords: ['what is', 'define', 'definition', 'meaning of', 'who is', 'when did', 'where is', 'what does'],
            score: 9,
            color: '#22c55e',
            reason: 'Easy - Factual/Definitional content'
        },
        medium: {
            keywords: ['how to', 'best way', 'steps to', 'guide', 'tutorial', 'how do', 'way to'],
            score: 6,
            color: '#f59e0b',
            reason: 'Medium - How-to/Tutorial content'
        },
        hard: {
            keywords: ['why does', 'why do', 'analyze', 'evaluate', 'impact of', 'effect of', 'cause of'],
            score: 3,
            color: '#ef4444',
            reason: 'Hard - Analysis/Research required'
        },
        veryHard: {
            keywords: ['best', 'worst', 'better', 'which is', 'should i', 'recommend', 'suggest'],
            score: 1,
            color: '#dc2626',
            reason: 'Very Hard - Opinion/Subjective content'
        }
    };
    
    function scoreQuestion(text) {
        const lower = text.toLowerCase();
        
        for (let [category, criteria] of Object.entries(SCORING_CRITERIA)) {
            for (let keyword of criteria.keywords) {
                if (lower.includes(keyword)) {
                    return {
                        score: criteria.score,
                        color: criteria.color,
                        reason: criteria.reason
                    };
                }
            }
        }
        
        return {
            score: 5,
            color: '#6b7280',
            reason: 'Standard - Mixed difficulty'
        };
    }
    
    function findQuestions() {
        const questions = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.includes('?') && text.length > 15 && text.length < 300) {
                // Check if it's likely a question
                const questionPatterns = [
                    /^(what|how|why|when|where|who|which|can|do|does|is|are|will|would|should|could)\s+/i,
                    /\?\s*$/
                ];
                
                if (questionPatterns.some(pattern => pattern.test(text))) {
                    // Avoid duplicates
                    if (!questions.find(q => q.text === text)) {
                        questions.push({
                            text: text,
                            element: el
                        });
                    }
                }
            }
        });
        
        return questions;
    }
    
    try {
        const questions = findQuestions();
        
        if (questions.length === 0) {
            return null;
        }
        
        const scoredQuestions = questions.map(q => {
            const scoring = scoreQuestion(q.text);
            return {
                text: q.text,
                score: scoring.score,
                color: scoring.color,
                reason: scoring.reason
            };
        });
        
        // Sort by score (highest first)
        scoredQuestions.sort((a, b) => b.score - a.score);
        
        return {
            url: window.location.href,
            questions: scoredQuestions
        };
        
    } catch (error) {
        console.error('Analysis error:', error);
        return null;
    }
}