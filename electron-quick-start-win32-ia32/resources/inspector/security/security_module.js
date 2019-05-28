Security.SecurityModel=class extends SDK.SDKModel{constructor(target){super(target);this._dispatcher=new Security.SecurityDispatcher(this);this._securityAgent=target.securityAgent();target.registerSecurityDispatcher(this._dispatcher);this._securityAgent.enable();}
resourceTreeModel(){return(this.target().model(SDK.ResourceTreeModel));}
networkManager(){return(this.target().model(SDK.NetworkManager));}
static SecurityStateComparator(a,b){let securityStateMap;if(Security.SecurityModel._symbolicToNumericSecurityState){securityStateMap=Security.SecurityModel._symbolicToNumericSecurityState;}else{securityStateMap=new Map();const ordering=[Protocol.Security.SecurityState.Info,Protocol.Security.SecurityState.Insecure,Protocol.Security.SecurityState.Neutral,Protocol.Security.SecurityState.Secure,Protocol.Security.SecurityState.Unknown];for(let i=0;i<ordering.length;i++)
securityStateMap.set(ordering[i],i+1);Security.SecurityModel._symbolicToNumericSecurityState=securityStateMap;}
const aScore=securityStateMap.get(a)||0;const bScore=securityStateMap.get(b)||0;return aScore-bScore;}};SDK.SDKModel.register(Security.SecurityModel,SDK.Target.Capability.Security,false);Security.SecurityModel.Events={SecurityStateChanged:Symbol('SecurityStateChanged')};Security.PageSecurityState=class{constructor(securityState,schemeIsCryptographic,explanations,insecureContentStatus,summary){this.securityState=securityState;this.schemeIsCryptographic=schemeIsCryptographic;this.explanations=explanations;this.insecureContentStatus=insecureContentStatus;this.summary=summary;}};Security.SecurityDispatcher=class{constructor(model){this._model=model;}
securityStateChanged(securityState,schemeIsCryptographic,explanations,insecureContentStatus,summary){const pageSecurityState=new Security.PageSecurityState(securityState,schemeIsCryptographic,explanations,insecureContentStatus,summary||null);this._model.dispatchEventToListeners(Security.SecurityModel.Events.SecurityStateChanged,pageSecurityState);}
certificateError(eventId,errorType,requestURL){}};;Security.SecurityPanel=class extends UI.PanelWithSidebar{constructor(){super('security');this._mainView=new Security.SecurityMainView(this);const title=createElementWithClass('span','title');title.textContent=Common.UIString('Overview');this._sidebarMainViewElement=new Security.SecurityPanelSidebarTreeElement(title,this._setVisibleView.bind(this,this._mainView),'security-main-view-sidebar-tree-item','lock-icon');this._sidebarMainViewElement.tooltip=title.textContent;this._sidebarTree=new Security.SecurityPanelSidebarTree(this._sidebarMainViewElement,this.showOrigin.bind(this));this.panelSidebarElement().appendChild(this._sidebarTree.element);this._lastResponseReceivedForLoaderId=new Map();this._origins=new Map();this._filterRequestCounts=new Map();SDK.targetManager.observeModels(Security.SecurityModel,this);}
static _instance(){return(self.runtime.sharedInstance(Security.SecurityPanel));}
static createCertificateViewerButtonForOrigin(text,origin){return UI.createTextButton(text,async e=>{e.consume();const names=await SDK.multitargetNetworkManager.getCertificate(origin);InspectorFrontendHost.showCertificateViewer(names);},'origin-button');}
static createCertificateViewerButtonForCert(text,names){return UI.createTextButton(text,e=>{e.consume();InspectorFrontendHost.showCertificateViewer(names);},'security-certificate-button');}
static createHighlightedUrl(url,securityState){const schemeSeparator='://';const index=url.indexOf(schemeSeparator);if(index===-1){const text=createElement('span','');text.textContent=url;return text;}
const highlightedUrl=createElement('span');const scheme=url.substr(0,index);const content=url.substr(index+schemeSeparator.length);highlightedUrl.createChild('span','url-scheme-'+securityState).textContent=scheme;highlightedUrl.createChild('span','url-scheme-separator').textContent=schemeSeparator;highlightedUrl.createChild('span').textContent=content;return highlightedUrl;}
setRanInsecureContentStyle(securityState){this._ranInsecureContentStyle=securityState;}
setDisplayedInsecureContentStyle(securityState){this._displayedInsecureContentStyle=securityState;}
_updateSecurityState(newSecurityState,schemeIsCryptographic,explanations,insecureContentStatus,summary){this._sidebarMainViewElement.setSecurityState(newSecurityState);this._mainView.updateSecurityState(newSecurityState,schemeIsCryptographic,explanations,insecureContentStatus,summary);}
_onSecurityStateChanged(event){const data=(event.data);const securityState=(data.securityState);const schemeIsCryptographic=(data.schemeIsCryptographic);const explanations=(data.explanations);const insecureContentStatus=(data.insecureContentStatus);const summary=(data.summary);this._updateSecurityState(securityState,schemeIsCryptographic,explanations,insecureContentStatus,summary);}
selectAndSwitchToMainView(){this._sidebarMainViewElement.select(true);}
showOrigin(origin){const originState=this._origins.get(origin);if(!originState.originView)
originState.originView=new Security.SecurityOriginView(this,origin,originState);this._setVisibleView(originState.originView);}
wasShown(){super.wasShown();if(!this._visibleView)
this.selectAndSwitchToMainView();}
focus(){this._sidebarTree.focus();}
_setVisibleView(view){if(this._visibleView===view)
return;if(this._visibleView)
this._visibleView.detach();this._visibleView=view;if(view)
this.splitWidget().setMainWidget(view);}
_onResponseReceived(event){const request=(event.data);if(request.resourceType()===Common.resourceTypes.Document)
this._lastResponseReceivedForLoaderId.set(request.loaderId,request);}
_processRequest(request){const origin=Common.ParsedURL.extractOrigin(request.url());if(!origin){return;}
let securityState=(request.securityState());if(request.mixedContentType===Protocol.Security.MixedContentType.Blockable&&this._ranInsecureContentStyle)
securityState=this._ranInsecureContentStyle;else if(request.mixedContentType===Protocol.Security.MixedContentType.OptionallyBlockable&&this._displayedInsecureContentStyle)
securityState=this._displayedInsecureContentStyle;if(this._origins.has(origin)){const originState=this._origins.get(origin);const oldSecurityState=originState.securityState;originState.securityState=this._securityStateMin(oldSecurityState,securityState);if(oldSecurityState!==originState.securityState){const securityDetails=(request.securityDetails());if(securityDetails)
originState.securityDetails=securityDetails;this._sidebarTree.updateOrigin(origin,securityState);if(originState.originView)
originState.originView.setSecurityState(securityState);}}else{const originState={};originState.securityState=securityState;const securityDetails=request.securityDetails();if(securityDetails)
originState.securityDetails=securityDetails;originState.loadedFromCache=request.cached();this._origins.set(origin,originState);this._sidebarTree.addOrigin(origin,securityState);}}
_onRequestFinished(event){const request=(event.data);this._updateFilterRequestCounts(request);this._processRequest(request);}
_updateFilterRequestCounts(request){if(request.mixedContentType===Protocol.Security.MixedContentType.None)
return;let filterKey=Network.NetworkLogView.MixedContentFilterValues.All;if(request.wasBlocked())
filterKey=Network.NetworkLogView.MixedContentFilterValues.Blocked;else if(request.mixedContentType===Protocol.Security.MixedContentType.Blockable)
filterKey=Network.NetworkLogView.MixedContentFilterValues.BlockOverridden;else if(request.mixedContentType===Protocol.Security.MixedContentType.OptionallyBlockable)
filterKey=Network.NetworkLogView.MixedContentFilterValues.Displayed;if(!this._filterRequestCounts.has(filterKey))
this._filterRequestCounts.set(filterKey,1);else
this._filterRequestCounts.set(filterKey,this._filterRequestCounts.get(filterKey)+1);this._mainView.refreshExplanations();}
filterRequestCount(filterKey){return this._filterRequestCounts.get(filterKey)||0;}
_securityStateMin(stateA,stateB){return Security.SecurityModel.SecurityStateComparator(stateA,stateB)<0?stateA:stateB;}
modelAdded(securityModel){if(this._securityModel)
return;this._securityModel=securityModel;const resourceTreeModel=securityModel.resourceTreeModel();const networkManager=securityModel.networkManager();this._eventListeners=[securityModel.addEventListener(Security.SecurityModel.Events.SecurityStateChanged,this._onSecurityStateChanged,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._onMainFrameNavigated,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.InterstitialShown,this._onInterstitialShown,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.InterstitialHidden,this._onInterstitialHidden,this),networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived,this._onResponseReceived,this),networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished,this._onRequestFinished,this),];if(resourceTreeModel.isInterstitialShowing())
this._onInterstitialShown();}
modelRemoved(securityModel){if(this._securityModel!==securityModel)
return;delete this._securityModel;Common.EventTarget.removeEventListeners(this._eventListeners);}
_onMainFrameNavigated(event){const frame=(event.data);const request=this._lastResponseReceivedForLoaderId.get(frame.loaderId);this.selectAndSwitchToMainView();this._sidebarTree.clearOrigins();this._origins.clear();this._lastResponseReceivedForLoaderId.clear();this._filterRequestCounts.clear();this._mainView.refreshExplanations();const origin=Common.ParsedURL.extractOrigin(request?request.url():frame.url);this._sidebarTree.setMainOrigin(origin);if(request)
this._processRequest(request);}
_onInterstitialShown(){this.selectAndSwitchToMainView();this._sidebarTree.toggleOriginsList(true);}
_onInterstitialHidden(){this._sidebarTree.toggleOriginsList(false);}};Security.SecurityPanel.Origin;Security.SecurityPanel.OriginState;Security.SecurityPanelSidebarTree=class extends UI.TreeOutlineInShadow{constructor(mainViewElement,showOriginInPanel){super();this.registerRequiredCSS('security/sidebar.css');this.registerRequiredCSS('security/lockIcon.css');this.appendChild(mainViewElement);this._showOriginInPanel=showOriginInPanel;this._mainOrigin=null;this._originGroups=new Map();for(const key in Security.SecurityPanelSidebarTree.OriginGroupName){const originGroupName=Security.SecurityPanelSidebarTree.OriginGroupName[key];const originGroup=new UI.TreeElement(originGroupName,true);originGroup.selectable=false;originGroup.setCollapsible(false);originGroup.expand();originGroup.listItemElement.classList.add('security-sidebar-origins');this._originGroups.set(originGroupName,originGroup);this.appendChild(originGroup);}
this._clearOriginGroups();const mainViewReloadMessage=new UI.TreeElement(Common.UIString('Reload to view details'));mainViewReloadMessage.selectable=false;mainViewReloadMessage.listItemElement.classList.add('security-main-view-reload-message');this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin).appendChild(mainViewReloadMessage);this._elementsByOrigin=new Map();}
toggleOriginsList(hidden){for(const key in Security.SecurityPanelSidebarTree.OriginGroupName){const originGroupName=Security.SecurityPanelSidebarTree.OriginGroupName[key];const group=this._originGroups.get(originGroupName);if(group)
group.hidden=hidden;}}
addOrigin(origin,securityState){const originElement=new Security.SecurityPanelSidebarTreeElement(Security.SecurityPanel.createHighlightedUrl(origin,securityState),this._showOriginInPanel.bind(this,origin),'security-sidebar-tree-item','security-property');originElement.tooltip=origin;this._elementsByOrigin.set(origin,originElement);this.updateOrigin(origin,securityState);}
setMainOrigin(origin){this._mainOrigin=origin;}
updateOrigin(origin,securityState){const originElement=(this._elementsByOrigin.get(origin));originElement.setSecurityState(securityState);let newParent;if(origin===this._mainOrigin){newParent=this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin);}else{switch(securityState){case Protocol.Security.SecurityState.Secure:newParent=this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.Secure);break;case Protocol.Security.SecurityState.Unknown:newParent=this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.Unknown);break;default:newParent=this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.NonSecure);break;}}
const oldParent=originElement.parent;if(oldParent!==newParent){if(oldParent){oldParent.removeChild(originElement);if(oldParent.childCount()===0)
oldParent.hidden=true;}
newParent.appendChild(originElement);newParent.hidden=false;}}
_clearOriginGroups(){for(const originGroup of this._originGroups.values()){originGroup.removeChildren();originGroup.hidden=true;}
this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin).hidden=false;}
clearOrigins(){this._clearOriginGroups();this._elementsByOrigin.clear();}};Security.SecurityPanelSidebarTree.OriginGroupName={MainOrigin:Common.UIString('Main origin'),NonSecure:Common.UIString('Non-secure origins'),Secure:Common.UIString('Secure origins'),Unknown:Common.UIString('Unknown / canceled')};Security.SecurityPanelSidebarTreeElement=class extends UI.TreeElement{constructor(textElement,selectCallback,className,cssPrefix){super('',false);this._selectCallback=selectCallback;this._cssPrefix=cssPrefix;this.listItemElement.classList.add(className);this._iconElement=this.listItemElement.createChild('div','icon');this._iconElement.classList.add(this._cssPrefix);this.listItemElement.appendChild(textElement);this.setSecurityState(Protocol.Security.SecurityState.Unknown);}
static SecurityStateComparator(a,b){return Security.SecurityModel.SecurityStateComparator(a.securityState(),b.securityState());}
setSecurityState(newSecurityState){if(this._securityState)
this._iconElement.classList.remove(this._cssPrefix+'-'+this._securityState);this._securityState=newSecurityState;this._iconElement.classList.add(this._cssPrefix+'-'+newSecurityState);}
securityState(){return this._securityState;}
onselect(){this._selectCallback();return true;}};Security.SecurityMainView=class extends UI.VBox{constructor(panel){super(true);this.registerRequiredCSS('security/mainView.css');this.registerRequiredCSS('security/lockIcon.css');this.setMinimumSize(200,100);this.contentElement.classList.add('security-main-view');this._panel=panel;this._summarySection=this.contentElement.createChild('div','security-summary');this._securityExplanationsMain=this.contentElement.createChild('div','security-explanation-list security-explanations-main');this._securityExplanationsExtra=this.contentElement.createChild('div','security-explanation-list security-explanations-extra');this._summarySection.createChild('div','security-summary-section-title').textContent=Common.UIString('Security overview');const lockSpectrum=this._summarySection.createChild('div','lock-spectrum');lockSpectrum.createChild('div','lock-icon lock-icon-secure').title=Common.UIString('Secure');lockSpectrum.createChild('div','lock-icon lock-icon-neutral').title=Common.UIString('Not secure');lockSpectrum.createChild('div','lock-icon lock-icon-insecure').title=Common.UIString('Not secure (broken)');this._summarySection.createChild('div','triangle-pointer-container').createChild('div','triangle-pointer-wrapper').createChild('div','triangle-pointer');this._summaryText=this._summarySection.createChild('div','security-summary-text');}
_addExplanation(parent,explanation){const explanationSection=parent.createChild('div','security-explanation');explanationSection.classList.add('security-explanation-'+explanation.securityState);explanationSection.createChild('div','security-property').classList.add('security-property-'+explanation.securityState);const text=explanationSection.createChild('div','security-explanation-text');const explanationHeader=text.createChild('div','security-explanation-title');if(explanation.title){explanationHeader.createChild('span').textContent=explanation.title+' - ';explanationHeader.createChild('span','security-explanation-title-'+explanation.securityState).textContent=explanation.summary;}else{explanationHeader.textContent=explanation.summary;}
text.createChild('div').textContent=explanation.description;if(explanation.certificate.length){text.appendChild(Security.SecurityPanel.createCertificateViewerButtonForCert(Common.UIString('View certificate'),explanation.certificate));}
if(explanation.recommendations&&explanation.recommendations.length){const recommendationList=text.createChild('ul','security-explanation-recommendations');for(const recommendation of explanation.recommendations)
recommendationList.createChild('li').textContent=recommendation;}
return text;}
updateSecurityState(newSecurityState,schemeIsCryptographic,explanations,insecureContentStatus,summary){this._summarySection.classList.remove('security-summary-'+this._securityState);this._securityState=newSecurityState;this._summarySection.classList.add('security-summary-'+this._securityState);const summaryExplanationStrings={'unknown':Common.UIString('The security of this page is unknown.'),'insecure':Common.UIString('This page is not secure (broken HTTPS).'),'neutral':Common.UIString('This page is not secure.'),'secure':Common.UIString('This page is secure (valid HTTPS).')};this._summaryText.textContent=summary||summaryExplanationStrings[this._securityState];this._explanations=explanations,this._insecureContentStatus=insecureContentStatus;this._schemeIsCryptographic=schemeIsCryptographic;this._panel.setRanInsecureContentStyle(insecureContentStatus.ranInsecureContentStyle);this._panel.setDisplayedInsecureContentStyle(insecureContentStatus.displayedInsecureContentStyle);this.refreshExplanations();}
refreshExplanations(){this._securityExplanationsMain.removeChildren();this._securityExplanationsExtra.removeChildren();for(const explanation of this._explanations){if(explanation.securityState===Protocol.Security.SecurityState.Info){this._addExplanation(this._securityExplanationsExtra,explanation);}else{switch(explanation.mixedContentType){case Protocol.Security.MixedContentType.Blockable:this._addMixedContentExplanation(this._securityExplanationsMain,explanation,Network.NetworkLogView.MixedContentFilterValues.BlockOverridden);break;case Protocol.Security.MixedContentType.OptionallyBlockable:this._addMixedContentExplanation(this._securityExplanationsMain,explanation,Network.NetworkLogView.MixedContentFilterValues.Displayed);break;default:this._addExplanation(this._securityExplanationsMain,explanation);break;}}}
if(this._panel.filterRequestCount(Network.NetworkLogView.MixedContentFilterValues.Blocked)>0){const explanation=({securityState:Protocol.Security.SecurityState.Info,summary:Common.UIString('Blocked mixed content'),description:Common.UIString('Your page requested non-secure resources that were blocked.'),mixedContentType:Protocol.Security.MixedContentType.Blockable,certificate:[]});this._addMixedContentExplanation(this._securityExplanationsMain,explanation,Network.NetworkLogView.MixedContentFilterValues.Blocked);}}
_addMixedContentExplanation(parent,explanation,filterKey){const element=this._addExplanation(parent,explanation);const filterRequestCount=this._panel.filterRequestCount(filterKey);if(!filterRequestCount){const refreshPrompt=element.createChild('div','security-mixed-content');refreshPrompt.textContent=Common.UIString('Reload the page to record requests for HTTP resources.');return;}
const requestsAnchor=element.createChild('div','security-mixed-content link');if(filterRequestCount===1)
requestsAnchor.textContent=Common.UIString('View %d request in Network Panel',filterRequestCount);else
requestsAnchor.textContent=Common.UIString('View %d requests in Network Panel',filterRequestCount);requestsAnchor.href='';requestsAnchor.addEventListener('click',this.showNetworkFilter.bind(this,filterKey));}
showNetworkFilter(filterKey,e){e.consume();Network.NetworkPanel.revealAndFilter([{filterType:Network.NetworkLogView.FilterType.MixedContent,filterValue:filterKey}]);}};Security.SecurityOriginView=class extends UI.VBox{constructor(panel,origin,originState){super();this._panel=panel;this.setMinimumSize(200,100);this.element.classList.add('security-origin-view');this.registerRequiredCSS('security/originView.css');this.registerRequiredCSS('security/lockIcon.css');const titleSection=this.element.createChild('div','title-section');titleSection.createChild('div','title-section-header').textContent=ls`Origin`;const originDisplay=titleSection.createChild('div','origin-display');this._originLockIcon=originDisplay.createChild('span','security-property');this._originLockIcon.classList.add('security-property-'+originState.securityState);originDisplay.appendChild(Security.SecurityPanel.createHighlightedUrl(origin,originState.securityState));const originNetworkButton=titleSection.createChild('div','view-network-button');originNetworkButton.appendChild(UI.createTextButton('View requests in Network Panel',e=>{e.consume();const parsedURL=new Common.ParsedURL(origin);Network.NetworkPanel.revealAndFilter([{filterType:Network.NetworkLogView.FilterType.Domain,filterValue:parsedURL.host},{filterType:Network.NetworkLogView.FilterType.Scheme,filterValue:parsedURL.scheme}]);},'origin-button'));if(originState.securityDetails){const connectionSection=this.element.createChild('div','origin-view-section');connectionSection.createChild('div','origin-view-section-title').textContent=Common.UIString('Connection');let table=new Security.SecurityDetailsTable();connectionSection.appendChild(table.element());table.addRow(Common.UIString('Protocol'),originState.securityDetails.protocol);if(originState.securityDetails.keyExchange)
table.addRow(Common.UIString('Key exchange'),originState.securityDetails.keyExchange);if(originState.securityDetails.keyExchangeGroup)
table.addRow(Common.UIString('Key exchange group'),originState.securityDetails.keyExchangeGroup);table.addRow(Common.UIString('Cipher'),originState.securityDetails.cipher+
(originState.securityDetails.mac?' with '+originState.securityDetails.mac:''));const certificateSection=this.element.createChild('div','origin-view-section');certificateSection.createChild('div','origin-view-section-title').textContent=Common.UIString('Certificate');const sctListLength=originState.securityDetails.signedCertificateTimestampList.length;const ctCompliance=originState.securityDetails.certificateTransparencyCompliance;let sctSection;if(sctListLength||ctCompliance!==Protocol.Network.CertificateTransparencyCompliance.Unknown){sctSection=this.element.createChild('div','origin-view-section');sctSection.createChild('div','origin-view-section-title').textContent=Common.UIString('Certificate Transparency');}
const sanDiv=this._createSanDiv(originState.securityDetails.sanList);const validFromString=new Date(1000*originState.securityDetails.validFrom).toUTCString();const validUntilString=new Date(1000*originState.securityDetails.validTo).toUTCString();table=new Security.SecurityDetailsTable();certificateSection.appendChild(table.element());table.addRow(Common.UIString('Subject'),originState.securityDetails.subjectName);table.addRow(Common.UIString('SAN'),sanDiv);table.addRow(Common.UIString('Valid from'),validFromString);table.addRow(Common.UIString('Valid until'),validUntilString);table.addRow(Common.UIString('Issuer'),originState.securityDetails.issuer);table.addRow('',Security.SecurityPanel.createCertificateViewerButtonForOrigin(Common.UIString('Open full certificate details'),origin));if(!sctSection)
return;const sctSummaryTable=new Security.SecurityDetailsTable();sctSummaryTable.element().classList.add('sct-summary');sctSection.appendChild(sctSummaryTable.element());for(let i=0;i<sctListLength;i++){const sct=originState.securityDetails.signedCertificateTimestampList[i];sctSummaryTable.addRow(Common.UIString('SCT'),sct.logDescription+' ('+sct.origin+', '+sct.status+')');}
const sctTableWrapper=sctSection.createChild('div','sct-details');sctTableWrapper.classList.add('hidden');for(let i=0;i<sctListLength;i++){const sctTable=new Security.SecurityDetailsTable();sctTableWrapper.appendChild(sctTable.element());const sct=originState.securityDetails.signedCertificateTimestampList[i];sctTable.addRow(Common.UIString('Log name'),sct.logDescription);sctTable.addRow(Common.UIString('Log ID'),sct.logId.replace(/(.{2})/g,'$1 '));sctTable.addRow(Common.UIString('Validation status'),sct.status);sctTable.addRow(Common.UIString('Source'),sct.origin);sctTable.addRow(Common.UIString('Issued at'),new Date(sct.timestamp).toUTCString());sctTable.addRow(Common.UIString('Hash algorithm'),sct.hashAlgorithm);sctTable.addRow(Common.UIString('Signature algorithm'),sct.signatureAlgorithm);sctTable.addRow(Common.UIString('Signature data'),sct.signatureData.replace(/(.{2})/g,'$1 '));}
if(sctListLength){const toggleSctsDetailsLink=sctSection.createChild('div','link');toggleSctsDetailsLink.classList.add('sct-toggle');toggleSctsDetailsLink.textContent=Common.UIString('Show full details');function toggleSctDetailsDisplay(){const isDetailsShown=!sctTableWrapper.classList.contains('hidden');if(isDetailsShown)
toggleSctsDetailsLink.textContent=Common.UIString('Show full details');else
toggleSctsDetailsLink.textContent=Common.UIString('Hide full details');sctSummaryTable.element().classList.toggle('hidden');sctTableWrapper.classList.toggle('hidden');}
toggleSctsDetailsLink.addEventListener('click',toggleSctDetailsDisplay,false);}
switch(ctCompliance){case Protocol.Network.CertificateTransparencyCompliance.Compliant:sctSection.createChild('div','origin-view-section-notes').textContent=Common.UIString('This request complies with Chrome\'s Certificate Transparency policy.');break;case Protocol.Network.CertificateTransparencyCompliance.NotCompliant:sctSection.createChild('div','origin-view-section-notes').textContent=Common.UIString('This request does not comply with Chrome\'s Certificate Transparency policy.');break;case Protocol.Network.CertificateTransparencyCompliance.Unknown:break;}
const noteSection=this.element.createChild('div','origin-view-section origin-view-notes');if(originState.loadedFromCache){noteSection.createChild('div').textContent=Common.UIString('This response was loaded from cache. Some security details might be missing.');}
noteSection.createChild('div').textContent=Common.UIString('The security details above are from the first inspected response.');}else if(originState.securityState!==Protocol.Security.SecurityState.Unknown){const notSecureSection=this.element.createChild('div','origin-view-section');notSecureSection.createChild('div','origin-view-section-title').textContent=Common.UIString('Not secure');notSecureSection.createChild('div').textContent=Common.UIString('Your connection to this origin is not secure.');}else{const noInfoSection=this.element.createChild('div','origin-view-section');noInfoSection.createChild('div','origin-view-section-title').textContent=Common.UIString('No security information');noInfoSection.createChild('div').textContent=Common.UIString('No security details are available for this origin.');}}
_createSanDiv(sanList){const sanDiv=createElement('div');if(sanList.length===0){sanDiv.textContent=Common.UIString('(n/a)');sanDiv.classList.add('empty-san');}else{const truncatedNumToShow=2;const listIsTruncated=sanList.length>truncatedNumToShow+1;for(let i=0;i<sanList.length;i++){const span=sanDiv.createChild('span','san-entry');span.textContent=sanList[i];if(listIsTruncated&&i>=truncatedNumToShow)
span.classList.add('truncated-entry');}
if(listIsTruncated){const truncatedSANToggle=sanDiv.createChild('div','link');truncatedSANToggle.href='';function toggleSANTruncation(){if(sanDiv.classList.contains('truncated-san')){sanDiv.classList.remove('truncated-san');truncatedSANToggle.textContent=Common.UIString('Show less');}else{sanDiv.classList.add('truncated-san');truncatedSANToggle.textContent=Common.UIString('Show more (%d total)',sanList.length);}}
truncatedSANToggle.addEventListener('click',toggleSANTruncation,false);toggleSANTruncation();}}
return sanDiv;}
setSecurityState(newSecurityState){for(const className of Array.prototype.slice.call(this._originLockIcon.classList)){if(className.startsWith('security-property-'))
this._originLockIcon.classList.remove(className);}
this._originLockIcon.classList.add('security-property-'+newSecurityState);}};Security.SecurityDetailsTable=class{constructor(){this._element=createElement('table');this._element.classList.add('details-table');}
element(){return this._element;}
addRow(key,value){const row=this._element.createChild('div','details-table-row');row.createChild('div').textContent=key;const valueDiv=row.createChild('div');if(typeof value==='string')
valueDiv.textContent=value;else
valueDiv.appendChild(value);}};;Runtime.cachedResources["security/lockIcon.css"]="/* Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.lock-icon,\n.security-property {\n    height: 16px;\n    width: 16px;\n\n    -webkit-mask-image: url(Images/securityIcons.png);\n    -webkit-mask-size: 80px 32px;\n\n    background-color: #888;\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.1) {\n    .lock-icon,\n    .security-property {\n        -webkit-mask-image: url(Images/securityIcons_2x.png);\n    }\n}\n\n.lock-icon-secure {\n    -webkit-mask-position: 0px 0px;\n    background-color: #0B8043;\n}\n\n.lock-icon-unknown,\n.lock-icon-neutral {\n    -webkit-mask-position: -16px 0px;\n    background-color: #000000; /* Black for clarity on lower DPI screens */\n}\n\n@media (-webkit-min-device-pixel-ratio: 1.1) {\n    .lock-icon-unknown,\n    .lock-icon-neutral {\n        background-color: #5A5A5A; /* Gray for hiDPI screens */\n    }\n}\n\n.lock-icon-insecure {\n    -webkit-mask-position: -32px 0px;\n    background-color: #C63626;\n}\n\n.security-property-secure {\n    -webkit-mask-position: 0px -16px;\n    background-color: #0B8043;\n}\n\n.security-property-neutral {\n    -webkit-mask-position: -16px -16px;\n    background-color: #C63626;\n}\n\n.security-property-insecure {\n    -webkit-mask-position: -32px -16px;\n    background-color: #C63626;\n}\n\n.security-property-info {\n    -webkit-mask-position: -48px -16px;\n    background-color: rgba(0, 0, 0, 0.5);\n}\n\n.security-property-unknown {\n    -webkit-mask-position: -64px -16px;\n    background-color: rgba(0, 0, 0, 0.5);\n}\n\n.url-scheme-secure {\n    color: #0b8043;\n}\n\n.url-scheme-neutral,\n.url-scheme-insecure {\n    color: #cb3626;\n}\n\n.url-scheme-separator {\n    color: #8a8a8a;\n}\n\n/*# sourceURL=security/lockIcon.css */";Runtime.cachedResources["security/mainView.css"]="/* Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.security-main-view {\n    -webkit-user-select: text;\n    overflow-x: hidden;\n    overflow-y: auto;\n    background-color: var(--toolbar-bg-color);\n}\n\n.security-main-view > div {\n    flex-shrink: 0;\n}\n\n.security-summary-section-title {\n    font-size: 15px;\n    margin: 12px 16px;\n}\n\n.lock-spectrum {\n    margin: 8px 16px;\n    display: flex;\n    align-items: flex-start;\n}\n\n.security-summary .lock-icon {\n    flex: none;\n    width: 16px;\n    height: 16px;\n    margin: 0 0;\n}\n\n/* Separate the middle icon from the other two. */\n.security-summary .lock-icon-neutral {\n    margin: 0 16px;\n}\n\n.security-summary:not(.security-summary-secure) .lock-icon-secure,\n.security-summary:not(.security-summary-neutral) .lock-icon-neutral,\n.security-summary:not(.security-summary-insecure) .lock-icon-insecure {\n    background-color: rgba(90, 90, 90, 0.25);\n}\n\n.triangle-pointer-container {\n    margin: 8px 24px 0;\n    padding: 0 0;\n}\n\n.triangle-pointer-wrapper {\n    /* Defaults for dynamic properties. */\n    transform: translateX(0);\n    transition: transform 0.3s;\n}\n\n.triangle-pointer {\n    width: 12px;\n    height: 12px;\n    margin-bottom: -6px;\n    margin-left: -6px;\n    transform: rotate(-45deg);\n    border-style: solid;\n    border-width: 1px 1px 0 0;\n\n    background: #fff;\n    border-color: rgb(217, 217, 217);\n}\n\n.security-summary-secure .triangle-pointer-wrapper {\n    transform: translateX(0px);\n}\n\n.security-summary-neutral .triangle-pointer-wrapper {\n    transform: translateX(32px);\n}\n\n.security-summary-insecure .triangle-pointer-wrapper {\n    transform: translateX(64px);\n}\n\n.security-summary-text {\n    padding: 16px 24px;\n    border-style: solid;\n    border-width: 1px 0;\n    font-size: 15px;\n\n    background: #fff;\n    border-color: rgb(217, 217, 217);\n}\n\n.security-summary-secure .triangle-pointer,\n.security-summary-secure .security-summary-text,\n.security-explanation-title-secure {\n    color: #0b8043;\n}\n\n.security-summary-insecure .triangle-pointer,\n.security-summary-insecure .security-summary-text,\n.security-explanation-title-neutral,\n.security-explanation-title-insecure {\n    color: #cb3626;\n}\n\n.security-explanation-list {\n    padding-bottom: 16px;\n}\n\n.security-explanation-list:empty {\n    border-bottom: none;\n    padding: 0px;\n}\n\n.security-explanations-main {\n    margin-top: -5px;\n    background-color: #fff;\n    border-bottom: 1px solid rgb(230, 230, 230);\n}\n\n.security-explanations-extra {\n    background-color: transparent;\n}\n\n.security-explanation {\n    padding: 11px;\n    display: flex;\n    white-space: nowrap;\n    border: none;\n    color: rgb(90, 90, 90);\n}\n\n.security-explanation-text {\n    flex: auto;\n    white-space: normal;\n    max-width: 400px;\n}\n\n.security-certificate-button {\n    margin-top: 8px;\n}\n\n.security-explanation .security-property {\n    flex: none;\n    width: 16px;\n    height: 16px;\n    margin-right: 16px;\n}\n\n.security-explanation-title {\n    color: rgb(48, 57, 66);\n    margin-top: 1px;\n    margin-bottom: 8px;\n}\n\n.security-explanation-neutral .security-section-title,\n.security-explanation-warning .security-section-title\n{\n    color: #cb3626;\n    font-weight: bold;\n}\n.security-explanation-insecure .security-section-title\n{\n    color: rgb(216, 71, 60);\n    font-weight: bold;\n}\n\n.security-mixed-content {\n    margin-top: 8px;\n}\n\n.security-explanation-recommendations {\n    padding-inline-start: 16px;\n}\n\n.security-explanation-recommendations > li {\n    margin-bottom: 4px;\n}\n\n/*# sourceURL=security/mainView.css */";Runtime.cachedResources["security/originView.css"]="/* Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.title-section {\n    padding: 16px 0 24px 0;\n    border-bottom: 1px solid rgb(230, 230, 230);\n}\n\n.title-section-header {\n    padding-left: 16px;\n    padding-bottom: 10px;\n    font-size: 14px;\n}\n\n.security-origin-view {\n    overflow-x: hidden;\n    overflow-y: scroll;\n    display: block;\n    -webkit-user-select: text;\n}\n\n.security-origin-view .origin-view-section {\n    border-bottom: 1px solid rgb(230, 230, 230);\n    padding: 12px 6px 12px  24px;\n    font-size:12px;\n}\n\n.origin-view-notes {\n    margin-top: 2px;\n    color: #8c8c8c;\n}\n\n.origin-view-section-notes {\n    margin-top: 6px;\n    color: #8c8c8c;\n}\n\n.security-origin-view .origin-display {\n    font-size: 12px;\n    padding-left: 38px;\n    display: flex;\n    align-items: center;\n}\n\n.title-section > .view-network-button {\n    padding: 6px 0 0 16px\n}\n\n.security-origin-view .origin-display .security-property {\n    display: inline-block;\n    vertical-align: middle;\n    position: absolute;\n    left: 16px;\n}\n\n.security-origin-view .origin-view-section-title {\n    margin-top: 4px;\n    margin-bottom: 4px;\n    font-weight: bold;\n}\n\n.security-origin-view .details-table-row {\n    display: flex;\n    white-space: nowrap;\n    overflow: hidden;\n    line-height: 22px;\n}\n\n.security-origin-view .details-table-row > div {\n    align-items: flex-start;\n}\n\n.security-origin-view .details-table-row > div:first-child {\n    color: rgb(140, 140, 140);\n    width: 110px;\n    margin-right: 1em;\n    flex: none;\n    display: flex;\n    justify-content: flex-end;\n}\n.security-origin-view .details-table-row > div:nth-child(2) {\n    flex: auto;\n    white-space: normal;\n}\n\n.security-origin-view .sct-details .details-table .details-table-row:last-child div:last-child {\n    border-bottom: 1px solid rgb(230, 230, 230);\n    padding-bottom: 10px;\n}\n\n.security-origin-view .sct-details .details-table:last-child .details-table-row:last-child div:last-child {\n    border-bottom: none;\n    padding-bottom: 0;\n}\n\n.security-origin-view .sct-toggle {\n    padding-left: 143px;\n    padding-top: 5px;\n}\n\n.security-origin-view .details-table .empty-san {\n    color: rgb(140, 140, 140);\n}\n\n.security-origin-view .details-table .san-entry {\n    display: block;\n}\n\n.security-origin-view .truncated-san .truncated-entry {\n    display: none;\n}\n\n.origin-button {\n    margin-top: 4px;\n}\n\n.origin-view-section:last-child  {\n    border-bottom:none;\n}\n\n/*# sourceURL=security/originView.css */";Runtime.cachedResources["security/sidebar.css"]="/* Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline li {\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    padding: 2px 5px;\n    overflow: hidden;\n    margin: 2px 0;\n    border-top: 1px solid transparent;\n    white-space: nowrap;\n}\n\n.tree-outline li.selected:focus .lock-icon,\n.tree-outline .security-sidebar-tree-item.selected:focus .icon\n{\n    background-color: var(--selection-fg-color);\n}\n\n.tree-outline .security-main-view-sidebar-tree-item {\n    border-bottom: 1px solid rgb(230, 230, 230);\n    padding: 16px 0;\n}\n\n.tree-outline li.security-sidebar-origins {\n    padding: 1px 8px 1px 13px;\n    margin-top: 1em;\n    margin-bottom: 0.5em;\n    color: rgb(90, 90, 90);\n    border-top: none;\n    line-height: 16px;\n    text-shadow: rgba(255, 255, 255, 0.75) 0 1px 0;\n}\n\n.tree-outline ol {\n    padding-left: 0;\n}\n\n.tree-outline li::before {\n    content: none;\n}\n\n.tree-outline .security-main-view-sidebar-tree-item,\n.tree-outline .security-sidebar-origins,\n.tree-outline li.security-sidebar-origins + .children > li {\n    padding-left: 16px;\n}\n\n.tree-outline .lock-icon,\n.tree-outline .security-property {\n    margin-right: 4px;\n    flex: none;\n}\n\n.security-sidebar-tree-item {\n    padding: 2px 0;\n}\n\n.security-sidebar-tree-item .title {\n    overflow: hidden;\n    margin-right: 5px;\n}\n\n.security-main-view-reload-message .tree-element-title {\n    color: rgba(0, 0, 0, 0.5);\n    padding-left: 8px;\n}\n\n/*# sourceURL=security/sidebar.css */";