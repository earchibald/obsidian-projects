import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace iterm2. */
export namespace iterm2 {

    /** Properties of a ClientOriginatedMessage. */
    interface IClientOriginatedMessage {

        /** ClientOriginatedMessage id */
        id?: (number|Long|null);

        /** ClientOriginatedMessage getBufferRequest */
        getBufferRequest?: (iterm2.IGetBufferRequest|null);

        /** ClientOriginatedMessage getPromptRequest */
        getPromptRequest?: (iterm2.IGetPromptRequest|null);

        /** ClientOriginatedMessage transactionRequest */
        transactionRequest?: (iterm2.ITransactionRequest|null);

        /** ClientOriginatedMessage notificationRequest */
        notificationRequest?: (iterm2.INotificationRequest|null);

        /** ClientOriginatedMessage registerToolRequest */
        registerToolRequest?: (iterm2.IRegisterToolRequest|null);

        /** ClientOriginatedMessage setProfilePropertyRequest */
        setProfilePropertyRequest?: (iterm2.ISetProfilePropertyRequest|null);

        /** ClientOriginatedMessage listSessionsRequest */
        listSessionsRequest?: (iterm2.IListSessionsRequest|null);

        /** ClientOriginatedMessage sendTextRequest */
        sendTextRequest?: (iterm2.ISendTextRequest|null);

        /** ClientOriginatedMessage createTabRequest */
        createTabRequest?: (iterm2.ICreateTabRequest|null);

        /** ClientOriginatedMessage splitPaneRequest */
        splitPaneRequest?: (iterm2.ISplitPaneRequest|null);

        /** ClientOriginatedMessage getProfilePropertyRequest */
        getProfilePropertyRequest?: (iterm2.IGetProfilePropertyRequest|null);

        /** ClientOriginatedMessage setPropertyRequest */
        setPropertyRequest?: (iterm2.ISetPropertyRequest|null);

        /** ClientOriginatedMessage getPropertyRequest */
        getPropertyRequest?: (iterm2.IGetPropertyRequest|null);

        /** ClientOriginatedMessage injectRequest */
        injectRequest?: (iterm2.IInjectRequest|null);

        /** ClientOriginatedMessage activateRequest */
        activateRequest?: (iterm2.IActivateRequest|null);

        /** ClientOriginatedMessage variableRequest */
        variableRequest?: (iterm2.IVariableRequest|null);

        /** ClientOriginatedMessage savedArrangementRequest */
        savedArrangementRequest?: (iterm2.ISavedArrangementRequest|null);

        /** ClientOriginatedMessage focusRequest */
        focusRequest?: (iterm2.IFocusRequest|null);

        /** ClientOriginatedMessage listProfilesRequest */
        listProfilesRequest?: (iterm2.IListProfilesRequest|null);

        /** ClientOriginatedMessage serverOriginatedRpcResultRequest */
        serverOriginatedRpcResultRequest?: (iterm2.IServerOriginatedRPCResultRequest|null);

        /** ClientOriginatedMessage restartSessionRequest */
        restartSessionRequest?: (iterm2.IRestartSessionRequest|null);

        /** ClientOriginatedMessage menuItemRequest */
        menuItemRequest?: (iterm2.IMenuItemRequest|null);

        /** ClientOriginatedMessage setTabLayoutRequest */
        setTabLayoutRequest?: (iterm2.ISetTabLayoutRequest|null);

        /** ClientOriginatedMessage getBroadcastDomainsRequest */
        getBroadcastDomainsRequest?: (iterm2.IGetBroadcastDomainsRequest|null);

        /** ClientOriginatedMessage tmuxRequest */
        tmuxRequest?: (iterm2.ITmuxRequest|null);

        /** ClientOriginatedMessage reorderTabsRequest */
        reorderTabsRequest?: (iterm2.IReorderTabsRequest|null);

        /** ClientOriginatedMessage preferencesRequest */
        preferencesRequest?: (iterm2.IPreferencesRequest|null);

        /** ClientOriginatedMessage colorPresetRequest */
        colorPresetRequest?: (iterm2.IColorPresetRequest|null);

        /** ClientOriginatedMessage selectionRequest */
        selectionRequest?: (iterm2.ISelectionRequest|null);

        /** ClientOriginatedMessage statusBarComponentRequest */
        statusBarComponentRequest?: (iterm2.IStatusBarComponentRequest|null);

        /** ClientOriginatedMessage setBroadcastDomainsRequest */
        setBroadcastDomainsRequest?: (iterm2.ISetBroadcastDomainsRequest|null);

        /** ClientOriginatedMessage closeRequest */
        closeRequest?: (iterm2.ICloseRequest|null);

        /** ClientOriginatedMessage invokeFunctionRequest */
        invokeFunctionRequest?: (iterm2.IInvokeFunctionRequest|null);

        /** ClientOriginatedMessage listPromptsRequest */
        listPromptsRequest?: (iterm2.IListPromptsRequest|null);
    }

    /** Represents a ClientOriginatedMessage. */
    class ClientOriginatedMessage implements IClientOriginatedMessage {

        /**
         * Constructs a new ClientOriginatedMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IClientOriginatedMessage);

        /** ClientOriginatedMessage id. */
        public id: (number|Long);

        /** ClientOriginatedMessage getBufferRequest. */
        public getBufferRequest?: (iterm2.IGetBufferRequest|null);

        /** ClientOriginatedMessage getPromptRequest. */
        public getPromptRequest?: (iterm2.IGetPromptRequest|null);

        /** ClientOriginatedMessage transactionRequest. */
        public transactionRequest?: (iterm2.ITransactionRequest|null);

        /** ClientOriginatedMessage notificationRequest. */
        public notificationRequest?: (iterm2.INotificationRequest|null);

        /** ClientOriginatedMessage registerToolRequest. */
        public registerToolRequest?: (iterm2.IRegisterToolRequest|null);

        /** ClientOriginatedMessage setProfilePropertyRequest. */
        public setProfilePropertyRequest?: (iterm2.ISetProfilePropertyRequest|null);

        /** ClientOriginatedMessage listSessionsRequest. */
        public listSessionsRequest?: (iterm2.IListSessionsRequest|null);

        /** ClientOriginatedMessage sendTextRequest. */
        public sendTextRequest?: (iterm2.ISendTextRequest|null);

        /** ClientOriginatedMessage createTabRequest. */
        public createTabRequest?: (iterm2.ICreateTabRequest|null);

        /** ClientOriginatedMessage splitPaneRequest. */
        public splitPaneRequest?: (iterm2.ISplitPaneRequest|null);

        /** ClientOriginatedMessage getProfilePropertyRequest. */
        public getProfilePropertyRequest?: (iterm2.IGetProfilePropertyRequest|null);

        /** ClientOriginatedMessage setPropertyRequest. */
        public setPropertyRequest?: (iterm2.ISetPropertyRequest|null);

        /** ClientOriginatedMessage getPropertyRequest. */
        public getPropertyRequest?: (iterm2.IGetPropertyRequest|null);

        /** ClientOriginatedMessage injectRequest. */
        public injectRequest?: (iterm2.IInjectRequest|null);

        /** ClientOriginatedMessage activateRequest. */
        public activateRequest?: (iterm2.IActivateRequest|null);

        /** ClientOriginatedMessage variableRequest. */
        public variableRequest?: (iterm2.IVariableRequest|null);

        /** ClientOriginatedMessage savedArrangementRequest. */
        public savedArrangementRequest?: (iterm2.ISavedArrangementRequest|null);

        /** ClientOriginatedMessage focusRequest. */
        public focusRequest?: (iterm2.IFocusRequest|null);

        /** ClientOriginatedMessage listProfilesRequest. */
        public listProfilesRequest?: (iterm2.IListProfilesRequest|null);

        /** ClientOriginatedMessage serverOriginatedRpcResultRequest. */
        public serverOriginatedRpcResultRequest?: (iterm2.IServerOriginatedRPCResultRequest|null);

        /** ClientOriginatedMessage restartSessionRequest. */
        public restartSessionRequest?: (iterm2.IRestartSessionRequest|null);

        /** ClientOriginatedMessage menuItemRequest. */
        public menuItemRequest?: (iterm2.IMenuItemRequest|null);

        /** ClientOriginatedMessage setTabLayoutRequest. */
        public setTabLayoutRequest?: (iterm2.ISetTabLayoutRequest|null);

        /** ClientOriginatedMessage getBroadcastDomainsRequest. */
        public getBroadcastDomainsRequest?: (iterm2.IGetBroadcastDomainsRequest|null);

        /** ClientOriginatedMessage tmuxRequest. */
        public tmuxRequest?: (iterm2.ITmuxRequest|null);

        /** ClientOriginatedMessage reorderTabsRequest. */
        public reorderTabsRequest?: (iterm2.IReorderTabsRequest|null);

        /** ClientOriginatedMessage preferencesRequest. */
        public preferencesRequest?: (iterm2.IPreferencesRequest|null);

        /** ClientOriginatedMessage colorPresetRequest. */
        public colorPresetRequest?: (iterm2.IColorPresetRequest|null);

        /** ClientOriginatedMessage selectionRequest. */
        public selectionRequest?: (iterm2.ISelectionRequest|null);

        /** ClientOriginatedMessage statusBarComponentRequest. */
        public statusBarComponentRequest?: (iterm2.IStatusBarComponentRequest|null);

        /** ClientOriginatedMessage setBroadcastDomainsRequest. */
        public setBroadcastDomainsRequest?: (iterm2.ISetBroadcastDomainsRequest|null);

        /** ClientOriginatedMessage closeRequest. */
        public closeRequest?: (iterm2.ICloseRequest|null);

        /** ClientOriginatedMessage invokeFunctionRequest. */
        public invokeFunctionRequest?: (iterm2.IInvokeFunctionRequest|null);

        /** ClientOriginatedMessage listPromptsRequest. */
        public listPromptsRequest?: (iterm2.IListPromptsRequest|null);

        /** ClientOriginatedMessage submessage. */
        public submessage?: ("getBufferRequest"|"getPromptRequest"|"transactionRequest"|"notificationRequest"|"registerToolRequest"|"setProfilePropertyRequest"|"listSessionsRequest"|"sendTextRequest"|"createTabRequest"|"splitPaneRequest"|"getProfilePropertyRequest"|"setPropertyRequest"|"getPropertyRequest"|"injectRequest"|"activateRequest"|"variableRequest"|"savedArrangementRequest"|"focusRequest"|"listProfilesRequest"|"serverOriginatedRpcResultRequest"|"restartSessionRequest"|"menuItemRequest"|"setTabLayoutRequest"|"getBroadcastDomainsRequest"|"tmuxRequest"|"reorderTabsRequest"|"preferencesRequest"|"colorPresetRequest"|"selectionRequest"|"statusBarComponentRequest"|"setBroadcastDomainsRequest"|"closeRequest"|"invokeFunctionRequest"|"listPromptsRequest");

        /**
         * Creates a new ClientOriginatedMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ClientOriginatedMessage instance
         */
        public static create(properties?: iterm2.IClientOriginatedMessage): iterm2.ClientOriginatedMessage;

        /**
         * Encodes the specified ClientOriginatedMessage message. Does not implicitly {@link iterm2.ClientOriginatedMessage.verify|verify} messages.
         * @param message ClientOriginatedMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IClientOriginatedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ClientOriginatedMessage message, length delimited. Does not implicitly {@link iterm2.ClientOriginatedMessage.verify|verify} messages.
         * @param message ClientOriginatedMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IClientOriginatedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ClientOriginatedMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ClientOriginatedMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ClientOriginatedMessage;

        /**
         * Decodes a ClientOriginatedMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ClientOriginatedMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ClientOriginatedMessage;

        /**
         * Verifies a ClientOriginatedMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ClientOriginatedMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ClientOriginatedMessage
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ClientOriginatedMessage;

        /**
         * Creates a plain object from a ClientOriginatedMessage message. Also converts values to other types if specified.
         * @param message ClientOriginatedMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ClientOriginatedMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ClientOriginatedMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ClientOriginatedMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ServerOriginatedMessage. */
    interface IServerOriginatedMessage {

        /** ServerOriginatedMessage id */
        id?: (number|Long|null);

        /** ServerOriginatedMessage error */
        error?: (string|null);

        /** ServerOriginatedMessage getBufferResponse */
        getBufferResponse?: (iterm2.IGetBufferResponse|null);

        /** ServerOriginatedMessage getPromptResponse */
        getPromptResponse?: (iterm2.IGetPromptResponse|null);

        /** ServerOriginatedMessage transactionResponse */
        transactionResponse?: (iterm2.ITransactionResponse|null);

        /** ServerOriginatedMessage notificationResponse */
        notificationResponse?: (iterm2.INotificationResponse|null);

        /** ServerOriginatedMessage registerToolResponse */
        registerToolResponse?: (iterm2.IRegisterToolResponse|null);

        /** ServerOriginatedMessage setProfilePropertyResponse */
        setProfilePropertyResponse?: (iterm2.ISetProfilePropertyResponse|null);

        /** ServerOriginatedMessage listSessionsResponse */
        listSessionsResponse?: (iterm2.IListSessionsResponse|null);

        /** ServerOriginatedMessage sendTextResponse */
        sendTextResponse?: (iterm2.ISendTextResponse|null);

        /** ServerOriginatedMessage createTabResponse */
        createTabResponse?: (iterm2.ICreateTabResponse|null);

        /** ServerOriginatedMessage splitPaneResponse */
        splitPaneResponse?: (iterm2.ISplitPaneResponse|null);

        /** ServerOriginatedMessage getProfilePropertyResponse */
        getProfilePropertyResponse?: (iterm2.IGetProfilePropertyResponse|null);

        /** ServerOriginatedMessage setPropertyResponse */
        setPropertyResponse?: (iterm2.ISetPropertyResponse|null);

        /** ServerOriginatedMessage getPropertyResponse */
        getPropertyResponse?: (iterm2.IGetPropertyResponse|null);

        /** ServerOriginatedMessage injectResponse */
        injectResponse?: (iterm2.IInjectResponse|null);

        /** ServerOriginatedMessage activateResponse */
        activateResponse?: (iterm2.IActivateResponse|null);

        /** ServerOriginatedMessage variableResponse */
        variableResponse?: (iterm2.IVariableResponse|null);

        /** ServerOriginatedMessage savedArrangementResponse */
        savedArrangementResponse?: (iterm2.ISavedArrangementResponse|null);

        /** ServerOriginatedMessage focusResponse */
        focusResponse?: (iterm2.IFocusResponse|null);

        /** ServerOriginatedMessage listProfilesResponse */
        listProfilesResponse?: (iterm2.IListProfilesResponse|null);

        /** ServerOriginatedMessage serverOriginatedRpcResultResponse */
        serverOriginatedRpcResultResponse?: (iterm2.IServerOriginatedRPCResultResponse|null);

        /** ServerOriginatedMessage restartSessionResponse */
        restartSessionResponse?: (iterm2.IRestartSessionResponse|null);

        /** ServerOriginatedMessage menuItemResponse */
        menuItemResponse?: (iterm2.IMenuItemResponse|null);

        /** ServerOriginatedMessage setTabLayoutResponse */
        setTabLayoutResponse?: (iterm2.ISetTabLayoutResponse|null);

        /** ServerOriginatedMessage getBroadcastDomainsResponse */
        getBroadcastDomainsResponse?: (iterm2.IGetBroadcastDomainsResponse|null);

        /** ServerOriginatedMessage tmuxResponse */
        tmuxResponse?: (iterm2.ITmuxResponse|null);

        /** ServerOriginatedMessage reorderTabsResponse */
        reorderTabsResponse?: (iterm2.IReorderTabsResponse|null);

        /** ServerOriginatedMessage preferencesResponse */
        preferencesResponse?: (iterm2.IPreferencesResponse|null);

        /** ServerOriginatedMessage colorPresetResponse */
        colorPresetResponse?: (iterm2.IColorPresetResponse|null);

        /** ServerOriginatedMessage selectionResponse */
        selectionResponse?: (iterm2.ISelectionResponse|null);

        /** ServerOriginatedMessage statusBarComponentResponse */
        statusBarComponentResponse?: (iterm2.IStatusBarComponentResponse|null);

        /** ServerOriginatedMessage setBroadcastDomainsResponse */
        setBroadcastDomainsResponse?: (iterm2.ISetBroadcastDomainsResponse|null);

        /** ServerOriginatedMessage closeResponse */
        closeResponse?: (iterm2.ICloseResponse|null);

        /** ServerOriginatedMessage invokeFunctionResponse */
        invokeFunctionResponse?: (iterm2.IInvokeFunctionResponse|null);

        /** ServerOriginatedMessage listPromptsResponse */
        listPromptsResponse?: (iterm2.IListPromptsResponse|null);

        /** ServerOriginatedMessage notification */
        notification?: (iterm2.INotification|null);
    }

    /** Represents a ServerOriginatedMessage. */
    class ServerOriginatedMessage implements IServerOriginatedMessage {

        /**
         * Constructs a new ServerOriginatedMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IServerOriginatedMessage);

        /** ServerOriginatedMessage id. */
        public id: (number|Long);

        /** ServerOriginatedMessage error. */
        public error?: (string|null);

        /** ServerOriginatedMessage getBufferResponse. */
        public getBufferResponse?: (iterm2.IGetBufferResponse|null);

        /** ServerOriginatedMessage getPromptResponse. */
        public getPromptResponse?: (iterm2.IGetPromptResponse|null);

        /** ServerOriginatedMessage transactionResponse. */
        public transactionResponse?: (iterm2.ITransactionResponse|null);

        /** ServerOriginatedMessage notificationResponse. */
        public notificationResponse?: (iterm2.INotificationResponse|null);

        /** ServerOriginatedMessage registerToolResponse. */
        public registerToolResponse?: (iterm2.IRegisterToolResponse|null);

        /** ServerOriginatedMessage setProfilePropertyResponse. */
        public setProfilePropertyResponse?: (iterm2.ISetProfilePropertyResponse|null);

        /** ServerOriginatedMessage listSessionsResponse. */
        public listSessionsResponse?: (iterm2.IListSessionsResponse|null);

        /** ServerOriginatedMessage sendTextResponse. */
        public sendTextResponse?: (iterm2.ISendTextResponse|null);

        /** ServerOriginatedMessage createTabResponse. */
        public createTabResponse?: (iterm2.ICreateTabResponse|null);

        /** ServerOriginatedMessage splitPaneResponse. */
        public splitPaneResponse?: (iterm2.ISplitPaneResponse|null);

        /** ServerOriginatedMessage getProfilePropertyResponse. */
        public getProfilePropertyResponse?: (iterm2.IGetProfilePropertyResponse|null);

        /** ServerOriginatedMessage setPropertyResponse. */
        public setPropertyResponse?: (iterm2.ISetPropertyResponse|null);

        /** ServerOriginatedMessage getPropertyResponse. */
        public getPropertyResponse?: (iterm2.IGetPropertyResponse|null);

        /** ServerOriginatedMessage injectResponse. */
        public injectResponse?: (iterm2.IInjectResponse|null);

        /** ServerOriginatedMessage activateResponse. */
        public activateResponse?: (iterm2.IActivateResponse|null);

        /** ServerOriginatedMessage variableResponse. */
        public variableResponse?: (iterm2.IVariableResponse|null);

        /** ServerOriginatedMessage savedArrangementResponse. */
        public savedArrangementResponse?: (iterm2.ISavedArrangementResponse|null);

        /** ServerOriginatedMessage focusResponse. */
        public focusResponse?: (iterm2.IFocusResponse|null);

        /** ServerOriginatedMessage listProfilesResponse. */
        public listProfilesResponse?: (iterm2.IListProfilesResponse|null);

        /** ServerOriginatedMessage serverOriginatedRpcResultResponse. */
        public serverOriginatedRpcResultResponse?: (iterm2.IServerOriginatedRPCResultResponse|null);

        /** ServerOriginatedMessage restartSessionResponse. */
        public restartSessionResponse?: (iterm2.IRestartSessionResponse|null);

        /** ServerOriginatedMessage menuItemResponse. */
        public menuItemResponse?: (iterm2.IMenuItemResponse|null);

        /** ServerOriginatedMessage setTabLayoutResponse. */
        public setTabLayoutResponse?: (iterm2.ISetTabLayoutResponse|null);

        /** ServerOriginatedMessage getBroadcastDomainsResponse. */
        public getBroadcastDomainsResponse?: (iterm2.IGetBroadcastDomainsResponse|null);

        /** ServerOriginatedMessage tmuxResponse. */
        public tmuxResponse?: (iterm2.ITmuxResponse|null);

        /** ServerOriginatedMessage reorderTabsResponse. */
        public reorderTabsResponse?: (iterm2.IReorderTabsResponse|null);

        /** ServerOriginatedMessage preferencesResponse. */
        public preferencesResponse?: (iterm2.IPreferencesResponse|null);

        /** ServerOriginatedMessage colorPresetResponse. */
        public colorPresetResponse?: (iterm2.IColorPresetResponse|null);

        /** ServerOriginatedMessage selectionResponse. */
        public selectionResponse?: (iterm2.ISelectionResponse|null);

        /** ServerOriginatedMessage statusBarComponentResponse. */
        public statusBarComponentResponse?: (iterm2.IStatusBarComponentResponse|null);

        /** ServerOriginatedMessage setBroadcastDomainsResponse. */
        public setBroadcastDomainsResponse?: (iterm2.ISetBroadcastDomainsResponse|null);

        /** ServerOriginatedMessage closeResponse. */
        public closeResponse?: (iterm2.ICloseResponse|null);

        /** ServerOriginatedMessage invokeFunctionResponse. */
        public invokeFunctionResponse?: (iterm2.IInvokeFunctionResponse|null);

        /** ServerOriginatedMessage listPromptsResponse. */
        public listPromptsResponse?: (iterm2.IListPromptsResponse|null);

        /** ServerOriginatedMessage notification. */
        public notification?: (iterm2.INotification|null);

        /** ServerOriginatedMessage submessage. */
        public submessage?: ("error"|"getBufferResponse"|"getPromptResponse"|"transactionResponse"|"notificationResponse"|"registerToolResponse"|"setProfilePropertyResponse"|"listSessionsResponse"|"sendTextResponse"|"createTabResponse"|"splitPaneResponse"|"getProfilePropertyResponse"|"setPropertyResponse"|"getPropertyResponse"|"injectResponse"|"activateResponse"|"variableResponse"|"savedArrangementResponse"|"focusResponse"|"listProfilesResponse"|"serverOriginatedRpcResultResponse"|"restartSessionResponse"|"menuItemResponse"|"setTabLayoutResponse"|"getBroadcastDomainsResponse"|"tmuxResponse"|"reorderTabsResponse"|"preferencesResponse"|"colorPresetResponse"|"selectionResponse"|"statusBarComponentResponse"|"setBroadcastDomainsResponse"|"closeResponse"|"invokeFunctionResponse"|"listPromptsResponse"|"notification");

        /**
         * Creates a new ServerOriginatedMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerOriginatedMessage instance
         */
        public static create(properties?: iterm2.IServerOriginatedMessage): iterm2.ServerOriginatedMessage;

        /**
         * Encodes the specified ServerOriginatedMessage message. Does not implicitly {@link iterm2.ServerOriginatedMessage.verify|verify} messages.
         * @param message ServerOriginatedMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IServerOriginatedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerOriginatedMessage message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedMessage.verify|verify} messages.
         * @param message ServerOriginatedMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IServerOriginatedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerOriginatedMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerOriginatedMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedMessage;

        /**
         * Decodes a ServerOriginatedMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerOriginatedMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedMessage;

        /**
         * Verifies a ServerOriginatedMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerOriginatedMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerOriginatedMessage
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedMessage;

        /**
         * Creates a plain object from a ServerOriginatedMessage message. Also converts values to other types if specified.
         * @param message ServerOriginatedMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ServerOriginatedMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerOriginatedMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ServerOriginatedMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an InvokeFunctionRequest. */
    interface IInvokeFunctionRequest {

        /** InvokeFunctionRequest tab */
        tab?: (iterm2.InvokeFunctionRequest.ITab|null);

        /** InvokeFunctionRequest session */
        session?: (iterm2.InvokeFunctionRequest.ISession|null);

        /** InvokeFunctionRequest window */
        window?: (iterm2.InvokeFunctionRequest.IWindow|null);

        /** InvokeFunctionRequest app */
        app?: (iterm2.InvokeFunctionRequest.IApp|null);

        /** InvokeFunctionRequest method */
        method?: (iterm2.InvokeFunctionRequest.IMethod|null);

        /** InvokeFunctionRequest invocation */
        invocation?: (string|null);

        /** InvokeFunctionRequest timeout */
        timeout?: (number|null);
    }

    /** Represents an InvokeFunctionRequest. */
    class InvokeFunctionRequest implements IInvokeFunctionRequest {

        /**
         * Constructs a new InvokeFunctionRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IInvokeFunctionRequest);

        /** InvokeFunctionRequest tab. */
        public tab?: (iterm2.InvokeFunctionRequest.ITab|null);

        /** InvokeFunctionRequest session. */
        public session?: (iterm2.InvokeFunctionRequest.ISession|null);

        /** InvokeFunctionRequest window. */
        public window?: (iterm2.InvokeFunctionRequest.IWindow|null);

        /** InvokeFunctionRequest app. */
        public app?: (iterm2.InvokeFunctionRequest.IApp|null);

        /** InvokeFunctionRequest method. */
        public method?: (iterm2.InvokeFunctionRequest.IMethod|null);

        /** InvokeFunctionRequest invocation. */
        public invocation: string;

        /** InvokeFunctionRequest timeout. */
        public timeout: number;

        /** InvokeFunctionRequest context. */
        public context?: ("tab"|"session"|"window"|"app"|"method");

        /**
         * Creates a new InvokeFunctionRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InvokeFunctionRequest instance
         */
        public static create(properties?: iterm2.IInvokeFunctionRequest): iterm2.InvokeFunctionRequest;

        /**
         * Encodes the specified InvokeFunctionRequest message. Does not implicitly {@link iterm2.InvokeFunctionRequest.verify|verify} messages.
         * @param message InvokeFunctionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IInvokeFunctionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InvokeFunctionRequest message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.verify|verify} messages.
         * @param message InvokeFunctionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IInvokeFunctionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InvokeFunctionRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InvokeFunctionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest;

        /**
         * Decodes an InvokeFunctionRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InvokeFunctionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest;

        /**
         * Verifies an InvokeFunctionRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InvokeFunctionRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InvokeFunctionRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest;

        /**
         * Creates a plain object from an InvokeFunctionRequest message. Also converts values to other types if specified.
         * @param message InvokeFunctionRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.InvokeFunctionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InvokeFunctionRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InvokeFunctionRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace InvokeFunctionRequest {

        /** Properties of a Tab. */
        interface ITab {

            /** Tab tabId */
            tabId?: (string|null);
        }

        /** Represents a Tab. */
        class Tab implements ITab {

            /**
             * Constructs a new Tab.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionRequest.ITab);

            /** Tab tabId. */
            public tabId: string;

            /**
             * Creates a new Tab instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Tab instance
             */
            public static create(properties?: iterm2.InvokeFunctionRequest.ITab): iterm2.InvokeFunctionRequest.Tab;

            /**
             * Encodes the specified Tab message. Does not implicitly {@link iterm2.InvokeFunctionRequest.Tab.verify|verify} messages.
             * @param message Tab message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionRequest.ITab, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Tab message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.Tab.verify|verify} messages.
             * @param message Tab message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionRequest.ITab, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Tab message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Tab
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest.Tab;

            /**
             * Decodes a Tab message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Tab
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest.Tab;

            /**
             * Verifies a Tab message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Tab message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Tab
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest.Tab;

            /**
             * Creates a plain object from a Tab message. Also converts values to other types if specified.
             * @param message Tab
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionRequest.Tab, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Tab to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Tab
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Session. */
        interface ISession {

            /** Session sessionId */
            sessionId?: (string|null);
        }

        /** Represents a Session. */
        class Session implements ISession {

            /**
             * Constructs a new Session.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionRequest.ISession);

            /** Session sessionId. */
            public sessionId: string;

            /**
             * Creates a new Session instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Session instance
             */
            public static create(properties?: iterm2.InvokeFunctionRequest.ISession): iterm2.InvokeFunctionRequest.Session;

            /**
             * Encodes the specified Session message. Does not implicitly {@link iterm2.InvokeFunctionRequest.Session.verify|verify} messages.
             * @param message Session message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionRequest.ISession, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Session message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.Session.verify|verify} messages.
             * @param message Session message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionRequest.ISession, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Session message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Session
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest.Session;

            /**
             * Decodes a Session message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Session
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest.Session;

            /**
             * Verifies a Session message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Session message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Session
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest.Session;

            /**
             * Creates a plain object from a Session message. Also converts values to other types if specified.
             * @param message Session
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionRequest.Session, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Session to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Session
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Window. */
        interface IWindow {

            /** Window windowId */
            windowId?: (string|null);
        }

        /** Represents a Window. */
        class Window implements IWindow {

            /**
             * Constructs a new Window.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionRequest.IWindow);

            /** Window windowId. */
            public windowId: string;

            /**
             * Creates a new Window instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Window instance
             */
            public static create(properties?: iterm2.InvokeFunctionRequest.IWindow): iterm2.InvokeFunctionRequest.Window;

            /**
             * Encodes the specified Window message. Does not implicitly {@link iterm2.InvokeFunctionRequest.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionRequest.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Window message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionRequest.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Window message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest.Window;

            /**
             * Decodes a Window message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest.Window;

            /**
             * Verifies a Window message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Window message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Window
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest.Window;

            /**
             * Creates a plain object from a Window message. Also converts values to other types if specified.
             * @param message Window
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionRequest.Window, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Window to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Window
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an App. */
        interface IApp {
        }

        /** Represents an App. */
        class App implements IApp {

            /**
             * Constructs a new App.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionRequest.IApp);

            /**
             * Creates a new App instance using the specified properties.
             * @param [properties] Properties to set
             * @returns App instance
             */
            public static create(properties?: iterm2.InvokeFunctionRequest.IApp): iterm2.InvokeFunctionRequest.App;

            /**
             * Encodes the specified App message. Does not implicitly {@link iterm2.InvokeFunctionRequest.App.verify|verify} messages.
             * @param message App message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionRequest.IApp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified App message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.App.verify|verify} messages.
             * @param message App message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionRequest.IApp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an App message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns App
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest.App;

            /**
             * Decodes an App message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns App
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest.App;

            /**
             * Verifies an App message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an App message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns App
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest.App;

            /**
             * Creates a plain object from an App message. Also converts values to other types if specified.
             * @param message App
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionRequest.App, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this App to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for App
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Method. */
        interface IMethod {

            /** Method receiver */
            receiver?: (string|null);
        }

        /** Represents a Method. */
        class Method implements IMethod {

            /**
             * Constructs a new Method.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionRequest.IMethod);

            /** Method receiver. */
            public receiver: string;

            /**
             * Creates a new Method instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Method instance
             */
            public static create(properties?: iterm2.InvokeFunctionRequest.IMethod): iterm2.InvokeFunctionRequest.Method;

            /**
             * Encodes the specified Method message. Does not implicitly {@link iterm2.InvokeFunctionRequest.Method.verify|verify} messages.
             * @param message Method message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionRequest.IMethod, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Method message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionRequest.Method.verify|verify} messages.
             * @param message Method message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionRequest.IMethod, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Method message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Method
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionRequest.Method;

            /**
             * Decodes a Method message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Method
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionRequest.Method;

            /**
             * Verifies a Method message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Method message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Method
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionRequest.Method;

            /**
             * Creates a plain object from a Method message. Also converts values to other types if specified.
             * @param message Method
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionRequest.Method, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Method to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Method
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of an InvokeFunctionResponse. */
    interface IInvokeFunctionResponse {

        /** InvokeFunctionResponse error */
        error?: (iterm2.InvokeFunctionResponse.IError|null);

        /** InvokeFunctionResponse success */
        success?: (iterm2.InvokeFunctionResponse.ISuccess|null);
    }

    /** Represents an InvokeFunctionResponse. */
    class InvokeFunctionResponse implements IInvokeFunctionResponse {

        /**
         * Constructs a new InvokeFunctionResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IInvokeFunctionResponse);

        /** InvokeFunctionResponse error. */
        public error?: (iterm2.InvokeFunctionResponse.IError|null);

        /** InvokeFunctionResponse success. */
        public success?: (iterm2.InvokeFunctionResponse.ISuccess|null);

        /** InvokeFunctionResponse disposition. */
        public disposition?: ("error"|"success");

        /**
         * Creates a new InvokeFunctionResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InvokeFunctionResponse instance
         */
        public static create(properties?: iterm2.IInvokeFunctionResponse): iterm2.InvokeFunctionResponse;

        /**
         * Encodes the specified InvokeFunctionResponse message. Does not implicitly {@link iterm2.InvokeFunctionResponse.verify|verify} messages.
         * @param message InvokeFunctionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IInvokeFunctionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InvokeFunctionResponse message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionResponse.verify|verify} messages.
         * @param message InvokeFunctionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IInvokeFunctionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InvokeFunctionResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InvokeFunctionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionResponse;

        /**
         * Decodes an InvokeFunctionResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InvokeFunctionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionResponse;

        /**
         * Verifies an InvokeFunctionResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InvokeFunctionResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InvokeFunctionResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionResponse;

        /**
         * Creates a plain object from an InvokeFunctionResponse message. Also converts values to other types if specified.
         * @param message InvokeFunctionResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.InvokeFunctionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InvokeFunctionResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InvokeFunctionResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace InvokeFunctionResponse {

        /** Status enum. */
        enum Status {
            TIMEOUT = 1,
            FAILED = 2,
            REQUEST_MALFORMED = 3,
            INVALID_ID = 4
        }

        /** Properties of an Error. */
        interface IError {

            /** Error status */
            status?: (iterm2.InvokeFunctionResponse.Status|null);

            /** Error errorReason */
            errorReason?: (string|null);
        }

        /** Represents an Error. */
        class Error implements IError {

            /**
             * Constructs a new Error.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionResponse.IError);

            /** Error status. */
            public status: iterm2.InvokeFunctionResponse.Status;

            /** Error errorReason. */
            public errorReason: string;

            /**
             * Creates a new Error instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Error instance
             */
            public static create(properties?: iterm2.InvokeFunctionResponse.IError): iterm2.InvokeFunctionResponse.Error;

            /**
             * Encodes the specified Error message. Does not implicitly {@link iterm2.InvokeFunctionResponse.Error.verify|verify} messages.
             * @param message Error message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionResponse.IError, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Error message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionResponse.Error.verify|verify} messages.
             * @param message Error message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionResponse.IError, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Error message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionResponse.Error;

            /**
             * Decodes an Error message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionResponse.Error;

            /**
             * Verifies an Error message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Error message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Error
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionResponse.Error;

            /**
             * Creates a plain object from an Error message. Also converts values to other types if specified.
             * @param message Error
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionResponse.Error, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Error to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Error
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Success. */
        interface ISuccess {

            /** Success jsonResult */
            jsonResult?: (string|null);
        }

        /** Represents a Success. */
        class Success implements ISuccess {

            /**
             * Constructs a new Success.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.InvokeFunctionResponse.ISuccess);

            /** Success jsonResult. */
            public jsonResult: string;

            /**
             * Creates a new Success instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Success instance
             */
            public static create(properties?: iterm2.InvokeFunctionResponse.ISuccess): iterm2.InvokeFunctionResponse.Success;

            /**
             * Encodes the specified Success message. Does not implicitly {@link iterm2.InvokeFunctionResponse.Success.verify|verify} messages.
             * @param message Success message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.InvokeFunctionResponse.ISuccess, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Success message, length delimited. Does not implicitly {@link iterm2.InvokeFunctionResponse.Success.verify|verify} messages.
             * @param message Success message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.InvokeFunctionResponse.ISuccess, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Success message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Success
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InvokeFunctionResponse.Success;

            /**
             * Decodes a Success message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Success
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InvokeFunctionResponse.Success;

            /**
             * Verifies a Success message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Success message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Success
             */
            public static fromObject(object: { [k: string]: any }): iterm2.InvokeFunctionResponse.Success;

            /**
             * Creates a plain object from a Success message. Also converts values to other types if specified.
             * @param message Success
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.InvokeFunctionResponse.Success, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Success to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Success
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a CloseRequest. */
    interface ICloseRequest {

        /** CloseRequest tabs */
        tabs?: (iterm2.CloseRequest.ICloseTabs|null);

        /** CloseRequest sessions */
        sessions?: (iterm2.CloseRequest.ICloseSessions|null);

        /** CloseRequest windows */
        windows?: (iterm2.CloseRequest.ICloseWindows|null);

        /** CloseRequest force */
        force?: (boolean|null);
    }

    /** Represents a CloseRequest. */
    class CloseRequest implements ICloseRequest {

        /**
         * Constructs a new CloseRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICloseRequest);

        /** CloseRequest tabs. */
        public tabs?: (iterm2.CloseRequest.ICloseTabs|null);

        /** CloseRequest sessions. */
        public sessions?: (iterm2.CloseRequest.ICloseSessions|null);

        /** CloseRequest windows. */
        public windows?: (iterm2.CloseRequest.ICloseWindows|null);

        /** CloseRequest force. */
        public force: boolean;

        /** CloseRequest target. */
        public target?: ("tabs"|"sessions"|"windows");

        /**
         * Creates a new CloseRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CloseRequest instance
         */
        public static create(properties?: iterm2.ICloseRequest): iterm2.CloseRequest;

        /**
         * Encodes the specified CloseRequest message. Does not implicitly {@link iterm2.CloseRequest.verify|verify} messages.
         * @param message CloseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICloseRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CloseRequest message, length delimited. Does not implicitly {@link iterm2.CloseRequest.verify|verify} messages.
         * @param message CloseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICloseRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CloseRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CloseRequest;

        /**
         * Decodes a CloseRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CloseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CloseRequest;

        /**
         * Verifies a CloseRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CloseRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CloseRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CloseRequest;

        /**
         * Creates a plain object from a CloseRequest message. Also converts values to other types if specified.
         * @param message CloseRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CloseRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CloseRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CloseRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace CloseRequest {

        /** Properties of a CloseTabs. */
        interface ICloseTabs {

            /** CloseTabs tabIds */
            tabIds?: (string[]|null);
        }

        /** Represents a CloseTabs. */
        class CloseTabs implements ICloseTabs {

            /**
             * Constructs a new CloseTabs.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.CloseRequest.ICloseTabs);

            /** CloseTabs tabIds. */
            public tabIds: string[];

            /**
             * Creates a new CloseTabs instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CloseTabs instance
             */
            public static create(properties?: iterm2.CloseRequest.ICloseTabs): iterm2.CloseRequest.CloseTabs;

            /**
             * Encodes the specified CloseTabs message. Does not implicitly {@link iterm2.CloseRequest.CloseTabs.verify|verify} messages.
             * @param message CloseTabs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.CloseRequest.ICloseTabs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CloseTabs message, length delimited. Does not implicitly {@link iterm2.CloseRequest.CloseTabs.verify|verify} messages.
             * @param message CloseTabs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.CloseRequest.ICloseTabs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CloseTabs message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CloseTabs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CloseRequest.CloseTabs;

            /**
             * Decodes a CloseTabs message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CloseTabs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CloseRequest.CloseTabs;

            /**
             * Verifies a CloseTabs message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CloseTabs message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CloseTabs
             */
            public static fromObject(object: { [k: string]: any }): iterm2.CloseRequest.CloseTabs;

            /**
             * Creates a plain object from a CloseTabs message. Also converts values to other types if specified.
             * @param message CloseTabs
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.CloseRequest.CloseTabs, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CloseTabs to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CloseTabs
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CloseSessions. */
        interface ICloseSessions {

            /** CloseSessions sessionIds */
            sessionIds?: (string[]|null);
        }

        /** Represents a CloseSessions. */
        class CloseSessions implements ICloseSessions {

            /**
             * Constructs a new CloseSessions.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.CloseRequest.ICloseSessions);

            /** CloseSessions sessionIds. */
            public sessionIds: string[];

            /**
             * Creates a new CloseSessions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CloseSessions instance
             */
            public static create(properties?: iterm2.CloseRequest.ICloseSessions): iterm2.CloseRequest.CloseSessions;

            /**
             * Encodes the specified CloseSessions message. Does not implicitly {@link iterm2.CloseRequest.CloseSessions.verify|verify} messages.
             * @param message CloseSessions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.CloseRequest.ICloseSessions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CloseSessions message, length delimited. Does not implicitly {@link iterm2.CloseRequest.CloseSessions.verify|verify} messages.
             * @param message CloseSessions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.CloseRequest.ICloseSessions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CloseSessions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CloseSessions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CloseRequest.CloseSessions;

            /**
             * Decodes a CloseSessions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CloseSessions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CloseRequest.CloseSessions;

            /**
             * Verifies a CloseSessions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CloseSessions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CloseSessions
             */
            public static fromObject(object: { [k: string]: any }): iterm2.CloseRequest.CloseSessions;

            /**
             * Creates a plain object from a CloseSessions message. Also converts values to other types if specified.
             * @param message CloseSessions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.CloseRequest.CloseSessions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CloseSessions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CloseSessions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CloseWindows. */
        interface ICloseWindows {

            /** CloseWindows windowIds */
            windowIds?: (string[]|null);
        }

        /** Represents a CloseWindows. */
        class CloseWindows implements ICloseWindows {

            /**
             * Constructs a new CloseWindows.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.CloseRequest.ICloseWindows);

            /** CloseWindows windowIds. */
            public windowIds: string[];

            /**
             * Creates a new CloseWindows instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CloseWindows instance
             */
            public static create(properties?: iterm2.CloseRequest.ICloseWindows): iterm2.CloseRequest.CloseWindows;

            /**
             * Encodes the specified CloseWindows message. Does not implicitly {@link iterm2.CloseRequest.CloseWindows.verify|verify} messages.
             * @param message CloseWindows message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.CloseRequest.ICloseWindows, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CloseWindows message, length delimited. Does not implicitly {@link iterm2.CloseRequest.CloseWindows.verify|verify} messages.
             * @param message CloseWindows message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.CloseRequest.ICloseWindows, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CloseWindows message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CloseWindows
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CloseRequest.CloseWindows;

            /**
             * Decodes a CloseWindows message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CloseWindows
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CloseRequest.CloseWindows;

            /**
             * Verifies a CloseWindows message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CloseWindows message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CloseWindows
             */
            public static fromObject(object: { [k: string]: any }): iterm2.CloseRequest.CloseWindows;

            /**
             * Creates a plain object from a CloseWindows message. Also converts values to other types if specified.
             * @param message CloseWindows
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.CloseRequest.CloseWindows, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CloseWindows to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CloseWindows
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a CloseResponse. */
    interface ICloseResponse {

        /** CloseResponse statuses */
        statuses?: (iterm2.CloseResponse.Status[]|null);
    }

    /** Represents a CloseResponse. */
    class CloseResponse implements ICloseResponse {

        /**
         * Constructs a new CloseResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICloseResponse);

        /** CloseResponse statuses. */
        public statuses: iterm2.CloseResponse.Status[];

        /**
         * Creates a new CloseResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CloseResponse instance
         */
        public static create(properties?: iterm2.ICloseResponse): iterm2.CloseResponse;

        /**
         * Encodes the specified CloseResponse message. Does not implicitly {@link iterm2.CloseResponse.verify|verify} messages.
         * @param message CloseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICloseResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CloseResponse message, length delimited. Does not implicitly {@link iterm2.CloseResponse.verify|verify} messages.
         * @param message CloseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICloseResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CloseResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CloseResponse;

        /**
         * Decodes a CloseResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CloseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CloseResponse;

        /**
         * Verifies a CloseResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CloseResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CloseResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CloseResponse;

        /**
         * Creates a plain object from a CloseResponse message. Also converts values to other types if specified.
         * @param message CloseResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CloseResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CloseResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CloseResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace CloseResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            NOT_FOUND = 1,
            USER_DECLINED = 2
        }
    }

    /** Properties of a SetBroadcastDomainsRequest. */
    interface ISetBroadcastDomainsRequest {

        /** SetBroadcastDomainsRequest broadcastDomains */
        broadcastDomains?: (iterm2.IBroadcastDomain[]|null);
    }

    /** Represents a SetBroadcastDomainsRequest. */
    class SetBroadcastDomainsRequest implements ISetBroadcastDomainsRequest {

        /**
         * Constructs a new SetBroadcastDomainsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetBroadcastDomainsRequest);

        /** SetBroadcastDomainsRequest broadcastDomains. */
        public broadcastDomains: iterm2.IBroadcastDomain[];

        /**
         * Creates a new SetBroadcastDomainsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetBroadcastDomainsRequest instance
         */
        public static create(properties?: iterm2.ISetBroadcastDomainsRequest): iterm2.SetBroadcastDomainsRequest;

        /**
         * Encodes the specified SetBroadcastDomainsRequest message. Does not implicitly {@link iterm2.SetBroadcastDomainsRequest.verify|verify} messages.
         * @param message SetBroadcastDomainsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetBroadcastDomainsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetBroadcastDomainsRequest message, length delimited. Does not implicitly {@link iterm2.SetBroadcastDomainsRequest.verify|verify} messages.
         * @param message SetBroadcastDomainsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetBroadcastDomainsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetBroadcastDomainsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetBroadcastDomainsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetBroadcastDomainsRequest;

        /**
         * Decodes a SetBroadcastDomainsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetBroadcastDomainsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetBroadcastDomainsRequest;

        /**
         * Verifies a SetBroadcastDomainsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetBroadcastDomainsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetBroadcastDomainsRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetBroadcastDomainsRequest;

        /**
         * Creates a plain object from a SetBroadcastDomainsRequest message. Also converts values to other types if specified.
         * @param message SetBroadcastDomainsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetBroadcastDomainsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetBroadcastDomainsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetBroadcastDomainsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SetBroadcastDomainsResponse. */
    interface ISetBroadcastDomainsResponse {

        /** SetBroadcastDomainsResponse status */
        status?: (iterm2.SetBroadcastDomainsResponse.Status|null);
    }

    /** Represents a SetBroadcastDomainsResponse. */
    class SetBroadcastDomainsResponse implements ISetBroadcastDomainsResponse {

        /**
         * Constructs a new SetBroadcastDomainsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetBroadcastDomainsResponse);

        /** SetBroadcastDomainsResponse status. */
        public status: iterm2.SetBroadcastDomainsResponse.Status;

        /**
         * Creates a new SetBroadcastDomainsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetBroadcastDomainsResponse instance
         */
        public static create(properties?: iterm2.ISetBroadcastDomainsResponse): iterm2.SetBroadcastDomainsResponse;

        /**
         * Encodes the specified SetBroadcastDomainsResponse message. Does not implicitly {@link iterm2.SetBroadcastDomainsResponse.verify|verify} messages.
         * @param message SetBroadcastDomainsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetBroadcastDomainsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetBroadcastDomainsResponse message, length delimited. Does not implicitly {@link iterm2.SetBroadcastDomainsResponse.verify|verify} messages.
         * @param message SetBroadcastDomainsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetBroadcastDomainsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetBroadcastDomainsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetBroadcastDomainsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetBroadcastDomainsResponse;

        /**
         * Decodes a SetBroadcastDomainsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetBroadcastDomainsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetBroadcastDomainsResponse;

        /**
         * Verifies a SetBroadcastDomainsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetBroadcastDomainsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetBroadcastDomainsResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetBroadcastDomainsResponse;

        /**
         * Creates a plain object from a SetBroadcastDomainsResponse message. Also converts values to other types if specified.
         * @param message SetBroadcastDomainsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetBroadcastDomainsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetBroadcastDomainsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetBroadcastDomainsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SetBroadcastDomainsResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            BROADCAST_DOMAINS_NOT_DISJOINT = 2,
            SESSIONS_NOT_IN_SAME_WINDOW = 3
        }
    }

    /** Properties of a StatusBarComponentRequest. */
    interface IStatusBarComponentRequest {

        /** StatusBarComponentRequest openPopover */
        openPopover?: (iterm2.StatusBarComponentRequest.IOpenPopover|null);

        /** StatusBarComponentRequest identifier */
        identifier?: (string|null);
    }

    /** Represents a StatusBarComponentRequest. */
    class StatusBarComponentRequest implements IStatusBarComponentRequest {

        /**
         * Constructs a new StatusBarComponentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IStatusBarComponentRequest);

        /** StatusBarComponentRequest openPopover. */
        public openPopover?: (iterm2.StatusBarComponentRequest.IOpenPopover|null);

        /** StatusBarComponentRequest identifier. */
        public identifier: string;

        /** StatusBarComponentRequest request. */
        public request?: "openPopover";

        /**
         * Creates a new StatusBarComponentRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StatusBarComponentRequest instance
         */
        public static create(properties?: iterm2.IStatusBarComponentRequest): iterm2.StatusBarComponentRequest;

        /**
         * Encodes the specified StatusBarComponentRequest message. Does not implicitly {@link iterm2.StatusBarComponentRequest.verify|verify} messages.
         * @param message StatusBarComponentRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IStatusBarComponentRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StatusBarComponentRequest message, length delimited. Does not implicitly {@link iterm2.StatusBarComponentRequest.verify|verify} messages.
         * @param message StatusBarComponentRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IStatusBarComponentRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StatusBarComponentRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StatusBarComponentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.StatusBarComponentRequest;

        /**
         * Decodes a StatusBarComponentRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StatusBarComponentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.StatusBarComponentRequest;

        /**
         * Verifies a StatusBarComponentRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StatusBarComponentRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StatusBarComponentRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.StatusBarComponentRequest;

        /**
         * Creates a plain object from a StatusBarComponentRequest message. Also converts values to other types if specified.
         * @param message StatusBarComponentRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.StatusBarComponentRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StatusBarComponentRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StatusBarComponentRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace StatusBarComponentRequest {

        /** Properties of an OpenPopover. */
        interface IOpenPopover {

            /** OpenPopover sessionId */
            sessionId?: (string|null);

            /** OpenPopover html */
            html?: (string|null);

            /** OpenPopover size */
            size?: (iterm2.ISize|null);
        }

        /** Represents an OpenPopover. */
        class OpenPopover implements IOpenPopover {

            /**
             * Constructs a new OpenPopover.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.StatusBarComponentRequest.IOpenPopover);

            /** OpenPopover sessionId. */
            public sessionId: string;

            /** OpenPopover html. */
            public html: string;

            /** OpenPopover size. */
            public size?: (iterm2.ISize|null);

            /**
             * Creates a new OpenPopover instance using the specified properties.
             * @param [properties] Properties to set
             * @returns OpenPopover instance
             */
            public static create(properties?: iterm2.StatusBarComponentRequest.IOpenPopover): iterm2.StatusBarComponentRequest.OpenPopover;

            /**
             * Encodes the specified OpenPopover message. Does not implicitly {@link iterm2.StatusBarComponentRequest.OpenPopover.verify|verify} messages.
             * @param message OpenPopover message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.StatusBarComponentRequest.IOpenPopover, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified OpenPopover message, length delimited. Does not implicitly {@link iterm2.StatusBarComponentRequest.OpenPopover.verify|verify} messages.
             * @param message OpenPopover message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.StatusBarComponentRequest.IOpenPopover, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an OpenPopover message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns OpenPopover
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.StatusBarComponentRequest.OpenPopover;

            /**
             * Decodes an OpenPopover message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns OpenPopover
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.StatusBarComponentRequest.OpenPopover;

            /**
             * Verifies an OpenPopover message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an OpenPopover message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns OpenPopover
             */
            public static fromObject(object: { [k: string]: any }): iterm2.StatusBarComponentRequest.OpenPopover;

            /**
             * Creates a plain object from an OpenPopover message. Also converts values to other types if specified.
             * @param message OpenPopover
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.StatusBarComponentRequest.OpenPopover, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this OpenPopover to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for OpenPopover
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a StatusBarComponentResponse. */
    interface IStatusBarComponentResponse {

        /** StatusBarComponentResponse status */
        status?: (iterm2.StatusBarComponentResponse.Status|null);
    }

    /** Represents a StatusBarComponentResponse. */
    class StatusBarComponentResponse implements IStatusBarComponentResponse {

        /**
         * Constructs a new StatusBarComponentResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IStatusBarComponentResponse);

        /** StatusBarComponentResponse status. */
        public status: iterm2.StatusBarComponentResponse.Status;

        /**
         * Creates a new StatusBarComponentResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StatusBarComponentResponse instance
         */
        public static create(properties?: iterm2.IStatusBarComponentResponse): iterm2.StatusBarComponentResponse;

        /**
         * Encodes the specified StatusBarComponentResponse message. Does not implicitly {@link iterm2.StatusBarComponentResponse.verify|verify} messages.
         * @param message StatusBarComponentResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IStatusBarComponentResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StatusBarComponentResponse message, length delimited. Does not implicitly {@link iterm2.StatusBarComponentResponse.verify|verify} messages.
         * @param message StatusBarComponentResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IStatusBarComponentResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StatusBarComponentResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StatusBarComponentResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.StatusBarComponentResponse;

        /**
         * Decodes a StatusBarComponentResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StatusBarComponentResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.StatusBarComponentResponse;

        /**
         * Verifies a StatusBarComponentResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StatusBarComponentResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StatusBarComponentResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.StatusBarComponentResponse;

        /**
         * Creates a plain object from a StatusBarComponentResponse message. Also converts values to other types if specified.
         * @param message StatusBarComponentResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.StatusBarComponentResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StatusBarComponentResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StatusBarComponentResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace StatusBarComponentResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2,
            INVALID_IDENTIFIER = 3
        }
    }

    /** Properties of a WindowedCoordRange. */
    interface IWindowedCoordRange {

        /** WindowedCoordRange coordRange */
        coordRange?: (iterm2.ICoordRange|null);

        /** WindowedCoordRange columns */
        columns?: (iterm2.IRange|null);
    }

    /** Represents a WindowedCoordRange. */
    class WindowedCoordRange implements IWindowedCoordRange {

        /**
         * Constructs a new WindowedCoordRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IWindowedCoordRange);

        /** WindowedCoordRange coordRange. */
        public coordRange?: (iterm2.ICoordRange|null);

        /** WindowedCoordRange columns. */
        public columns?: (iterm2.IRange|null);

        /**
         * Creates a new WindowedCoordRange instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WindowedCoordRange instance
         */
        public static create(properties?: iterm2.IWindowedCoordRange): iterm2.WindowedCoordRange;

        /**
         * Encodes the specified WindowedCoordRange message. Does not implicitly {@link iterm2.WindowedCoordRange.verify|verify} messages.
         * @param message WindowedCoordRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IWindowedCoordRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WindowedCoordRange message, length delimited. Does not implicitly {@link iterm2.WindowedCoordRange.verify|verify} messages.
         * @param message WindowedCoordRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IWindowedCoordRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WindowedCoordRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WindowedCoordRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.WindowedCoordRange;

        /**
         * Decodes a WindowedCoordRange message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WindowedCoordRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.WindowedCoordRange;

        /**
         * Verifies a WindowedCoordRange message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WindowedCoordRange message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WindowedCoordRange
         */
        public static fromObject(object: { [k: string]: any }): iterm2.WindowedCoordRange;

        /**
         * Creates a plain object from a WindowedCoordRange message. Also converts values to other types if specified.
         * @param message WindowedCoordRange
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.WindowedCoordRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WindowedCoordRange to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WindowedCoordRange
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** SelectionMode enum. */
    enum SelectionMode {
        CHARACTER = 0,
        WORD = 1,
        LINE = 2,
        SMART = 3,
        BOX = 4,
        WHOLE_LINE = 5
    }

    /** Properties of a SubSelection. */
    interface ISubSelection {

        /** SubSelection windowedCoordRange */
        windowedCoordRange?: (iterm2.IWindowedCoordRange|null);

        /** SubSelection selectionMode */
        selectionMode?: (iterm2.SelectionMode|null);

        /** SubSelection connected */
        connected?: (boolean|null);
    }

    /** Represents a SubSelection. */
    class SubSelection implements ISubSelection {

        /**
         * Constructs a new SubSelection.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISubSelection);

        /** SubSelection windowedCoordRange. */
        public windowedCoordRange?: (iterm2.IWindowedCoordRange|null);

        /** SubSelection selectionMode. */
        public selectionMode: iterm2.SelectionMode;

        /** SubSelection connected. */
        public connected: boolean;

        /**
         * Creates a new SubSelection instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SubSelection instance
         */
        public static create(properties?: iterm2.ISubSelection): iterm2.SubSelection;

        /**
         * Encodes the specified SubSelection message. Does not implicitly {@link iterm2.SubSelection.verify|verify} messages.
         * @param message SubSelection message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISubSelection, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SubSelection message, length delimited. Does not implicitly {@link iterm2.SubSelection.verify|verify} messages.
         * @param message SubSelection message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISubSelection, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SubSelection message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SubSelection
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SubSelection;

        /**
         * Decodes a SubSelection message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SubSelection
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SubSelection;

        /**
         * Verifies a SubSelection message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SubSelection message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SubSelection
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SubSelection;

        /**
         * Creates a plain object from a SubSelection message. Also converts values to other types if specified.
         * @param message SubSelection
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SubSelection, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SubSelection to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SubSelection
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Selection. */
    interface ISelection {

        /** Selection subSelections */
        subSelections?: (iterm2.ISubSelection[]|null);
    }

    /** Represents a Selection. */
    class Selection implements ISelection {

        /**
         * Constructs a new Selection.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISelection);

        /** Selection subSelections. */
        public subSelections: iterm2.ISubSelection[];

        /**
         * Creates a new Selection instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Selection instance
         */
        public static create(properties?: iterm2.ISelection): iterm2.Selection;

        /**
         * Encodes the specified Selection message. Does not implicitly {@link iterm2.Selection.verify|verify} messages.
         * @param message Selection message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISelection, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Selection message, length delimited. Does not implicitly {@link iterm2.Selection.verify|verify} messages.
         * @param message Selection message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISelection, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Selection message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Selection
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Selection;

        /**
         * Decodes a Selection message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Selection
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Selection;

        /**
         * Verifies a Selection message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Selection message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Selection
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Selection;

        /**
         * Creates a plain object from a Selection message. Also converts values to other types if specified.
         * @param message Selection
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Selection, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Selection to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Selection
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SelectionRequest. */
    interface ISelectionRequest {

        /** SelectionRequest getSelectionRequest */
        getSelectionRequest?: (iterm2.SelectionRequest.IGetSelectionRequest|null);

        /** SelectionRequest setSelectionRequest */
        setSelectionRequest?: (iterm2.SelectionRequest.ISetSelectionRequest|null);
    }

    /** Represents a SelectionRequest. */
    class SelectionRequest implements ISelectionRequest {

        /**
         * Constructs a new SelectionRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISelectionRequest);

        /** SelectionRequest getSelectionRequest. */
        public getSelectionRequest?: (iterm2.SelectionRequest.IGetSelectionRequest|null);

        /** SelectionRequest setSelectionRequest. */
        public setSelectionRequest?: (iterm2.SelectionRequest.ISetSelectionRequest|null);

        /** SelectionRequest request. */
        public request?: ("getSelectionRequest"|"setSelectionRequest");

        /**
         * Creates a new SelectionRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SelectionRequest instance
         */
        public static create(properties?: iterm2.ISelectionRequest): iterm2.SelectionRequest;

        /**
         * Encodes the specified SelectionRequest message. Does not implicitly {@link iterm2.SelectionRequest.verify|verify} messages.
         * @param message SelectionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SelectionRequest message, length delimited. Does not implicitly {@link iterm2.SelectionRequest.verify|verify} messages.
         * @param message SelectionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SelectionRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SelectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionRequest;

        /**
         * Decodes a SelectionRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SelectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionRequest;

        /**
         * Verifies a SelectionRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SelectionRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SelectionRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SelectionRequest;

        /**
         * Creates a plain object from a SelectionRequest message. Also converts values to other types if specified.
         * @param message SelectionRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SelectionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SelectionRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SelectionRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SelectionRequest {

        /** Properties of a GetSelectionRequest. */
        interface IGetSelectionRequest {

            /** GetSelectionRequest sessionId */
            sessionId?: (string|null);
        }

        /** Represents a GetSelectionRequest. */
        class GetSelectionRequest implements IGetSelectionRequest {

            /**
             * Constructs a new GetSelectionRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SelectionRequest.IGetSelectionRequest);

            /** GetSelectionRequest sessionId. */
            public sessionId: string;

            /**
             * Creates a new GetSelectionRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetSelectionRequest instance
             */
            public static create(properties?: iterm2.SelectionRequest.IGetSelectionRequest): iterm2.SelectionRequest.GetSelectionRequest;

            /**
             * Encodes the specified GetSelectionRequest message. Does not implicitly {@link iterm2.SelectionRequest.GetSelectionRequest.verify|verify} messages.
             * @param message GetSelectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SelectionRequest.IGetSelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetSelectionRequest message, length delimited. Does not implicitly {@link iterm2.SelectionRequest.GetSelectionRequest.verify|verify} messages.
             * @param message GetSelectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SelectionRequest.IGetSelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetSelectionRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetSelectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionRequest.GetSelectionRequest;

            /**
             * Decodes a GetSelectionRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetSelectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionRequest.GetSelectionRequest;

            /**
             * Verifies a GetSelectionRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetSelectionRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetSelectionRequest
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SelectionRequest.GetSelectionRequest;

            /**
             * Creates a plain object from a GetSelectionRequest message. Also converts values to other types if specified.
             * @param message GetSelectionRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SelectionRequest.GetSelectionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetSelectionRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetSelectionRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SetSelectionRequest. */
        interface ISetSelectionRequest {

            /** SetSelectionRequest sessionId */
            sessionId?: (string|null);

            /** SetSelectionRequest selection */
            selection?: (iterm2.ISelection|null);
        }

        /** Represents a SetSelectionRequest. */
        class SetSelectionRequest implements ISetSelectionRequest {

            /**
             * Constructs a new SetSelectionRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SelectionRequest.ISetSelectionRequest);

            /** SetSelectionRequest sessionId. */
            public sessionId: string;

            /** SetSelectionRequest selection. */
            public selection?: (iterm2.ISelection|null);

            /**
             * Creates a new SetSelectionRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SetSelectionRequest instance
             */
            public static create(properties?: iterm2.SelectionRequest.ISetSelectionRequest): iterm2.SelectionRequest.SetSelectionRequest;

            /**
             * Encodes the specified SetSelectionRequest message. Does not implicitly {@link iterm2.SelectionRequest.SetSelectionRequest.verify|verify} messages.
             * @param message SetSelectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SelectionRequest.ISetSelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SetSelectionRequest message, length delimited. Does not implicitly {@link iterm2.SelectionRequest.SetSelectionRequest.verify|verify} messages.
             * @param message SetSelectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SelectionRequest.ISetSelectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SetSelectionRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SetSelectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionRequest.SetSelectionRequest;

            /**
             * Decodes a SetSelectionRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SetSelectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionRequest.SetSelectionRequest;

            /**
             * Verifies a SetSelectionRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SetSelectionRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SetSelectionRequest
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SelectionRequest.SetSelectionRequest;

            /**
             * Creates a plain object from a SetSelectionRequest message. Also converts values to other types if specified.
             * @param message SetSelectionRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SelectionRequest.SetSelectionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SetSelectionRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SetSelectionRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a SelectionResponse. */
    interface ISelectionResponse {

        /** SelectionResponse status */
        status?: (iterm2.SelectionResponse.Status|null);

        /** SelectionResponse getSelectionResponse */
        getSelectionResponse?: (iterm2.SelectionResponse.IGetSelectionResponse|null);

        /** SelectionResponse setSelectionResponse */
        setSelectionResponse?: (iterm2.SelectionResponse.ISetSelectionResponse|null);
    }

    /** Represents a SelectionResponse. */
    class SelectionResponse implements ISelectionResponse {

        /**
         * Constructs a new SelectionResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISelectionResponse);

        /** SelectionResponse status. */
        public status: iterm2.SelectionResponse.Status;

        /** SelectionResponse getSelectionResponse. */
        public getSelectionResponse?: (iterm2.SelectionResponse.IGetSelectionResponse|null);

        /** SelectionResponse setSelectionResponse. */
        public setSelectionResponse?: (iterm2.SelectionResponse.ISetSelectionResponse|null);

        /** SelectionResponse response. */
        public response?: ("getSelectionResponse"|"setSelectionResponse");

        /**
         * Creates a new SelectionResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SelectionResponse instance
         */
        public static create(properties?: iterm2.ISelectionResponse): iterm2.SelectionResponse;

        /**
         * Encodes the specified SelectionResponse message. Does not implicitly {@link iterm2.SelectionResponse.verify|verify} messages.
         * @param message SelectionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SelectionResponse message, length delimited. Does not implicitly {@link iterm2.SelectionResponse.verify|verify} messages.
         * @param message SelectionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SelectionResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SelectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionResponse;

        /**
         * Decodes a SelectionResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SelectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionResponse;

        /**
         * Verifies a SelectionResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SelectionResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SelectionResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SelectionResponse;

        /**
         * Creates a plain object from a SelectionResponse message. Also converts values to other types if specified.
         * @param message SelectionResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SelectionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SelectionResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SelectionResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SelectionResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            INVALID_SESSION = 1,
            INVALID_RANGE = 2,
            REQUEST_MALFORMED = 3
        }

        /** Properties of a GetSelectionResponse. */
        interface IGetSelectionResponse {

            /** GetSelectionResponse selection */
            selection?: (iterm2.ISelection|null);
        }

        /** Represents a GetSelectionResponse. */
        class GetSelectionResponse implements IGetSelectionResponse {

            /**
             * Constructs a new GetSelectionResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SelectionResponse.IGetSelectionResponse);

            /** GetSelectionResponse selection. */
            public selection?: (iterm2.ISelection|null);

            /**
             * Creates a new GetSelectionResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetSelectionResponse instance
             */
            public static create(properties?: iterm2.SelectionResponse.IGetSelectionResponse): iterm2.SelectionResponse.GetSelectionResponse;

            /**
             * Encodes the specified GetSelectionResponse message. Does not implicitly {@link iterm2.SelectionResponse.GetSelectionResponse.verify|verify} messages.
             * @param message GetSelectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SelectionResponse.IGetSelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetSelectionResponse message, length delimited. Does not implicitly {@link iterm2.SelectionResponse.GetSelectionResponse.verify|verify} messages.
             * @param message GetSelectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SelectionResponse.IGetSelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetSelectionResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetSelectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionResponse.GetSelectionResponse;

            /**
             * Decodes a GetSelectionResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetSelectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionResponse.GetSelectionResponse;

            /**
             * Verifies a GetSelectionResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetSelectionResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetSelectionResponse
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SelectionResponse.GetSelectionResponse;

            /**
             * Creates a plain object from a GetSelectionResponse message. Also converts values to other types if specified.
             * @param message GetSelectionResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SelectionResponse.GetSelectionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetSelectionResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetSelectionResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SetSelectionResponse. */
        interface ISetSelectionResponse {
        }

        /** Represents a SetSelectionResponse. */
        class SetSelectionResponse implements ISetSelectionResponse {

            /**
             * Constructs a new SetSelectionResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SelectionResponse.ISetSelectionResponse);

            /**
             * Creates a new SetSelectionResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SetSelectionResponse instance
             */
            public static create(properties?: iterm2.SelectionResponse.ISetSelectionResponse): iterm2.SelectionResponse.SetSelectionResponse;

            /**
             * Encodes the specified SetSelectionResponse message. Does not implicitly {@link iterm2.SelectionResponse.SetSelectionResponse.verify|verify} messages.
             * @param message SetSelectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SelectionResponse.ISetSelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SetSelectionResponse message, length delimited. Does not implicitly {@link iterm2.SelectionResponse.SetSelectionResponse.verify|verify} messages.
             * @param message SetSelectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SelectionResponse.ISetSelectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SetSelectionResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SetSelectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SelectionResponse.SetSelectionResponse;

            /**
             * Decodes a SetSelectionResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SetSelectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SelectionResponse.SetSelectionResponse;

            /**
             * Verifies a SetSelectionResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SetSelectionResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SetSelectionResponse
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SelectionResponse.SetSelectionResponse;

            /**
             * Creates a plain object from a SetSelectionResponse message. Also converts values to other types if specified.
             * @param message SetSelectionResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SelectionResponse.SetSelectionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SetSelectionResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SetSelectionResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a ColorPresetRequest. */
    interface IColorPresetRequest {

        /** ColorPresetRequest listPresets */
        listPresets?: (iterm2.ColorPresetRequest.IListPresets|null);

        /** ColorPresetRequest getPreset */
        getPreset?: (iterm2.ColorPresetRequest.IGetPreset|null);
    }

    /** Represents a ColorPresetRequest. */
    class ColorPresetRequest implements IColorPresetRequest {

        /**
         * Constructs a new ColorPresetRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IColorPresetRequest);

        /** ColorPresetRequest listPresets. */
        public listPresets?: (iterm2.ColorPresetRequest.IListPresets|null);

        /** ColorPresetRequest getPreset. */
        public getPreset?: (iterm2.ColorPresetRequest.IGetPreset|null);

        /** ColorPresetRequest request. */
        public request?: ("listPresets"|"getPreset");

        /**
         * Creates a new ColorPresetRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ColorPresetRequest instance
         */
        public static create(properties?: iterm2.IColorPresetRequest): iterm2.ColorPresetRequest;

        /**
         * Encodes the specified ColorPresetRequest message. Does not implicitly {@link iterm2.ColorPresetRequest.verify|verify} messages.
         * @param message ColorPresetRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IColorPresetRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ColorPresetRequest message, length delimited. Does not implicitly {@link iterm2.ColorPresetRequest.verify|verify} messages.
         * @param message ColorPresetRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IColorPresetRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ColorPresetRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ColorPresetRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetRequest;

        /**
         * Decodes a ColorPresetRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ColorPresetRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetRequest;

        /**
         * Verifies a ColorPresetRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ColorPresetRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ColorPresetRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetRequest;

        /**
         * Creates a plain object from a ColorPresetRequest message. Also converts values to other types if specified.
         * @param message ColorPresetRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ColorPresetRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ColorPresetRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ColorPresetRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ColorPresetRequest {

        /** Properties of a ListPresets. */
        interface IListPresets {
        }

        /** Represents a ListPresets. */
        class ListPresets implements IListPresets {

            /**
             * Constructs a new ListPresets.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ColorPresetRequest.IListPresets);

            /**
             * Creates a new ListPresets instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListPresets instance
             */
            public static create(properties?: iterm2.ColorPresetRequest.IListPresets): iterm2.ColorPresetRequest.ListPresets;

            /**
             * Encodes the specified ListPresets message. Does not implicitly {@link iterm2.ColorPresetRequest.ListPresets.verify|verify} messages.
             * @param message ListPresets message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ColorPresetRequest.IListPresets, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListPresets message, length delimited. Does not implicitly {@link iterm2.ColorPresetRequest.ListPresets.verify|verify} messages.
             * @param message ListPresets message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ColorPresetRequest.IListPresets, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListPresets message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ListPresets
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetRequest.ListPresets;

            /**
             * Decodes a ListPresets message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListPresets
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetRequest.ListPresets;

            /**
             * Verifies a ListPresets message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ListPresets message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ListPresets
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetRequest.ListPresets;

            /**
             * Creates a plain object from a ListPresets message. Also converts values to other types if specified.
             * @param message ListPresets
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ColorPresetRequest.ListPresets, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ListPresets to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ListPresets
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPreset. */
        interface IGetPreset {

            /** GetPreset name */
            name?: (string|null);
        }

        /** Represents a GetPreset. */
        class GetPreset implements IGetPreset {

            /**
             * Constructs a new GetPreset.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ColorPresetRequest.IGetPreset);

            /** GetPreset name. */
            public name: string;

            /**
             * Creates a new GetPreset instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPreset instance
             */
            public static create(properties?: iterm2.ColorPresetRequest.IGetPreset): iterm2.ColorPresetRequest.GetPreset;

            /**
             * Encodes the specified GetPreset message. Does not implicitly {@link iterm2.ColorPresetRequest.GetPreset.verify|verify} messages.
             * @param message GetPreset message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ColorPresetRequest.IGetPreset, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPreset message, length delimited. Does not implicitly {@link iterm2.ColorPresetRequest.GetPreset.verify|verify} messages.
             * @param message GetPreset message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ColorPresetRequest.IGetPreset, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPreset message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPreset
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetRequest.GetPreset;

            /**
             * Decodes a GetPreset message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPreset
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetRequest.GetPreset;

            /**
             * Verifies a GetPreset message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPreset message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPreset
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetRequest.GetPreset;

            /**
             * Creates a plain object from a GetPreset message. Also converts values to other types if specified.
             * @param message GetPreset
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ColorPresetRequest.GetPreset, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPreset to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPreset
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a ColorPresetResponse. */
    interface IColorPresetResponse {

        /** ColorPresetResponse listPresets */
        listPresets?: (iterm2.ColorPresetResponse.IListPresets|null);

        /** ColorPresetResponse getPreset */
        getPreset?: (iterm2.ColorPresetResponse.IGetPreset|null);

        /** ColorPresetResponse status */
        status?: (iterm2.ColorPresetResponse.Status|null);
    }

    /** Represents a ColorPresetResponse. */
    class ColorPresetResponse implements IColorPresetResponse {

        /**
         * Constructs a new ColorPresetResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IColorPresetResponse);

        /** ColorPresetResponse listPresets. */
        public listPresets?: (iterm2.ColorPresetResponse.IListPresets|null);

        /** ColorPresetResponse getPreset. */
        public getPreset?: (iterm2.ColorPresetResponse.IGetPreset|null);

        /** ColorPresetResponse status. */
        public status: iterm2.ColorPresetResponse.Status;

        /** ColorPresetResponse response. */
        public response?: ("listPresets"|"getPreset");

        /**
         * Creates a new ColorPresetResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ColorPresetResponse instance
         */
        public static create(properties?: iterm2.IColorPresetResponse): iterm2.ColorPresetResponse;

        /**
         * Encodes the specified ColorPresetResponse message. Does not implicitly {@link iterm2.ColorPresetResponse.verify|verify} messages.
         * @param message ColorPresetResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IColorPresetResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ColorPresetResponse message, length delimited. Does not implicitly {@link iterm2.ColorPresetResponse.verify|verify} messages.
         * @param message ColorPresetResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IColorPresetResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ColorPresetResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ColorPresetResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetResponse;

        /**
         * Decodes a ColorPresetResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ColorPresetResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetResponse;

        /**
         * Verifies a ColorPresetResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ColorPresetResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ColorPresetResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetResponse;

        /**
         * Creates a plain object from a ColorPresetResponse message. Also converts values to other types if specified.
         * @param message ColorPresetResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ColorPresetResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ColorPresetResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ColorPresetResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ColorPresetResponse {

        /** Properties of a ListPresets. */
        interface IListPresets {

            /** ListPresets name */
            name?: (string[]|null);
        }

        /** Represents a ListPresets. */
        class ListPresets implements IListPresets {

            /**
             * Constructs a new ListPresets.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ColorPresetResponse.IListPresets);

            /** ListPresets name. */
            public name: string[];

            /**
             * Creates a new ListPresets instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListPresets instance
             */
            public static create(properties?: iterm2.ColorPresetResponse.IListPresets): iterm2.ColorPresetResponse.ListPresets;

            /**
             * Encodes the specified ListPresets message. Does not implicitly {@link iterm2.ColorPresetResponse.ListPresets.verify|verify} messages.
             * @param message ListPresets message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ColorPresetResponse.IListPresets, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListPresets message, length delimited. Does not implicitly {@link iterm2.ColorPresetResponse.ListPresets.verify|verify} messages.
             * @param message ListPresets message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ColorPresetResponse.IListPresets, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListPresets message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ListPresets
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetResponse.ListPresets;

            /**
             * Decodes a ListPresets message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListPresets
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetResponse.ListPresets;

            /**
             * Verifies a ListPresets message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ListPresets message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ListPresets
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetResponse.ListPresets;

            /**
             * Creates a plain object from a ListPresets message. Also converts values to other types if specified.
             * @param message ListPresets
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ColorPresetResponse.ListPresets, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ListPresets to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ListPresets
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPreset. */
        interface IGetPreset {

            /** GetPreset colorSettings */
            colorSettings?: (iterm2.ColorPresetResponse.GetPreset.IColorSetting[]|null);
        }

        /** Represents a GetPreset. */
        class GetPreset implements IGetPreset {

            /**
             * Constructs a new GetPreset.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ColorPresetResponse.IGetPreset);

            /** GetPreset colorSettings. */
            public colorSettings: iterm2.ColorPresetResponse.GetPreset.IColorSetting[];

            /**
             * Creates a new GetPreset instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPreset instance
             */
            public static create(properties?: iterm2.ColorPresetResponse.IGetPreset): iterm2.ColorPresetResponse.GetPreset;

            /**
             * Encodes the specified GetPreset message. Does not implicitly {@link iterm2.ColorPresetResponse.GetPreset.verify|verify} messages.
             * @param message GetPreset message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ColorPresetResponse.IGetPreset, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPreset message, length delimited. Does not implicitly {@link iterm2.ColorPresetResponse.GetPreset.verify|verify} messages.
             * @param message GetPreset message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ColorPresetResponse.IGetPreset, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPreset message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPreset
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetResponse.GetPreset;

            /**
             * Decodes a GetPreset message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPreset
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetResponse.GetPreset;

            /**
             * Verifies a GetPreset message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPreset message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPreset
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetResponse.GetPreset;

            /**
             * Creates a plain object from a GetPreset message. Also converts values to other types if specified.
             * @param message GetPreset
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ColorPresetResponse.GetPreset, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPreset to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPreset
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace GetPreset {

            /** Properties of a ColorSetting. */
            interface IColorSetting {

                /** ColorSetting red */
                red?: (number|null);

                /** ColorSetting green */
                green?: (number|null);

                /** ColorSetting blue */
                blue?: (number|null);

                /** ColorSetting alpha */
                alpha?: (number|null);

                /** ColorSetting colorSpace */
                colorSpace?: (string|null);

                /** ColorSetting key */
                key?: (string|null);
            }

            /** Represents a ColorSetting. */
            class ColorSetting implements IColorSetting {

                /**
                 * Constructs a new ColorSetting.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.ColorPresetResponse.GetPreset.IColorSetting);

                /** ColorSetting red. */
                public red: number;

                /** ColorSetting green. */
                public green: number;

                /** ColorSetting blue. */
                public blue: number;

                /** ColorSetting alpha. */
                public alpha: number;

                /** ColorSetting colorSpace. */
                public colorSpace: string;

                /** ColorSetting key. */
                public key: string;

                /**
                 * Creates a new ColorSetting instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ColorSetting instance
                 */
                public static create(properties?: iterm2.ColorPresetResponse.GetPreset.IColorSetting): iterm2.ColorPresetResponse.GetPreset.ColorSetting;

                /**
                 * Encodes the specified ColorSetting message. Does not implicitly {@link iterm2.ColorPresetResponse.GetPreset.ColorSetting.verify|verify} messages.
                 * @param message ColorSetting message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.ColorPresetResponse.GetPreset.IColorSetting, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ColorSetting message, length delimited. Does not implicitly {@link iterm2.ColorPresetResponse.GetPreset.ColorSetting.verify|verify} messages.
                 * @param message ColorSetting message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.ColorPresetResponse.GetPreset.IColorSetting, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ColorSetting message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ColorSetting
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ColorPresetResponse.GetPreset.ColorSetting;

                /**
                 * Decodes a ColorSetting message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ColorSetting
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ColorPresetResponse.GetPreset.ColorSetting;

                /**
                 * Verifies a ColorSetting message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ColorSetting message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ColorSetting
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.ColorPresetResponse.GetPreset.ColorSetting;

                /**
                 * Creates a plain object from a ColorSetting message. Also converts values to other types if specified.
                 * @param message ColorSetting
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.ColorPresetResponse.GetPreset.ColorSetting, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ColorSetting to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for ColorSetting
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Status enum. */
        enum Status {
            OK = 0,
            PRESET_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2
        }
    }

    /** Properties of a PreferencesRequest. */
    interface IPreferencesRequest {

        /** PreferencesRequest requests */
        requests?: (iterm2.PreferencesRequest.IRequest[]|null);
    }

    /** Represents a PreferencesRequest. */
    class PreferencesRequest implements IPreferencesRequest {

        /**
         * Constructs a new PreferencesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPreferencesRequest);

        /** PreferencesRequest requests. */
        public requests: iterm2.PreferencesRequest.IRequest[];

        /**
         * Creates a new PreferencesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PreferencesRequest instance
         */
        public static create(properties?: iterm2.IPreferencesRequest): iterm2.PreferencesRequest;

        /**
         * Encodes the specified PreferencesRequest message. Does not implicitly {@link iterm2.PreferencesRequest.verify|verify} messages.
         * @param message PreferencesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPreferencesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PreferencesRequest message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.verify|verify} messages.
         * @param message PreferencesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPreferencesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PreferencesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PreferencesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest;

        /**
         * Decodes a PreferencesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PreferencesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest;

        /**
         * Verifies a PreferencesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PreferencesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PreferencesRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest;

        /**
         * Creates a plain object from a PreferencesRequest message. Also converts values to other types if specified.
         * @param message PreferencesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PreferencesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PreferencesRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PreferencesRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace PreferencesRequest {

        /** Properties of a Request. */
        interface IRequest {

            /** Request setPreferenceRequest */
            setPreferenceRequest?: (iterm2.PreferencesRequest.Request.ISetPreference|null);

            /** Request getPreferenceRequest */
            getPreferenceRequest?: (iterm2.PreferencesRequest.Request.IGetPreference|null);

            /** Request setDefaultProfileRequest */
            setDefaultProfileRequest?: (iterm2.PreferencesRequest.Request.ISetDefaultProfile|null);

            /** Request getDefaultProfileRequest */
            getDefaultProfileRequest?: (iterm2.PreferencesRequest.Request.IGetDefaultProfile|null);
        }

        /** Represents a Request. */
        class Request implements IRequest {

            /**
             * Constructs a new Request.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.PreferencesRequest.IRequest);

            /** Request setPreferenceRequest. */
            public setPreferenceRequest?: (iterm2.PreferencesRequest.Request.ISetPreference|null);

            /** Request getPreferenceRequest. */
            public getPreferenceRequest?: (iterm2.PreferencesRequest.Request.IGetPreference|null);

            /** Request setDefaultProfileRequest. */
            public setDefaultProfileRequest?: (iterm2.PreferencesRequest.Request.ISetDefaultProfile|null);

            /** Request getDefaultProfileRequest. */
            public getDefaultProfileRequest?: (iterm2.PreferencesRequest.Request.IGetDefaultProfile|null);

            /** Request request. */
            public request?: ("setPreferenceRequest"|"getPreferenceRequest"|"setDefaultProfileRequest"|"getDefaultProfileRequest");

            /**
             * Creates a new Request instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Request instance
             */
            public static create(properties?: iterm2.PreferencesRequest.IRequest): iterm2.PreferencesRequest.Request;

            /**
             * Encodes the specified Request message. Does not implicitly {@link iterm2.PreferencesRequest.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.PreferencesRequest.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.PreferencesRequest.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest.Request;

            /**
             * Decodes a Request message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest.Request;

            /**
             * Verifies a Request message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Request message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Request
             */
            public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest.Request;

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @param message Request
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.PreferencesRequest.Request, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Request to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Request
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace Request {

            /** Properties of a SetPreference. */
            interface ISetPreference {

                /** SetPreference key */
                key?: (string|null);

                /** SetPreference jsonValue */
                jsonValue?: (string|null);
            }

            /** Represents a SetPreference. */
            class SetPreference implements ISetPreference {

                /**
                 * Constructs a new SetPreference.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesRequest.Request.ISetPreference);

                /** SetPreference key. */
                public key: string;

                /** SetPreference jsonValue. */
                public jsonValue: string;

                /**
                 * Creates a new SetPreference instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SetPreference instance
                 */
                public static create(properties?: iterm2.PreferencesRequest.Request.ISetPreference): iterm2.PreferencesRequest.Request.SetPreference;

                /**
                 * Encodes the specified SetPreference message. Does not implicitly {@link iterm2.PreferencesRequest.Request.SetPreference.verify|verify} messages.
                 * @param message SetPreference message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesRequest.Request.ISetPreference, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SetPreference message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.Request.SetPreference.verify|verify} messages.
                 * @param message SetPreference message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesRequest.Request.ISetPreference, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SetPreference message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SetPreference
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest.Request.SetPreference;

                /**
                 * Decodes a SetPreference message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SetPreference
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest.Request.SetPreference;

                /**
                 * Verifies a SetPreference message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SetPreference message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SetPreference
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest.Request.SetPreference;

                /**
                 * Creates a plain object from a SetPreference message. Also converts values to other types if specified.
                 * @param message SetPreference
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesRequest.Request.SetPreference, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SetPreference to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for SetPreference
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a GetPreference. */
            interface IGetPreference {

                /** GetPreference key */
                key?: (string|null);
            }

            /** Represents a GetPreference. */
            class GetPreference implements IGetPreference {

                /**
                 * Constructs a new GetPreference.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesRequest.Request.IGetPreference);

                /** GetPreference key. */
                public key: string;

                /**
                 * Creates a new GetPreference instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetPreference instance
                 */
                public static create(properties?: iterm2.PreferencesRequest.Request.IGetPreference): iterm2.PreferencesRequest.Request.GetPreference;

                /**
                 * Encodes the specified GetPreference message. Does not implicitly {@link iterm2.PreferencesRequest.Request.GetPreference.verify|verify} messages.
                 * @param message GetPreference message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesRequest.Request.IGetPreference, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetPreference message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.Request.GetPreference.verify|verify} messages.
                 * @param message GetPreference message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesRequest.Request.IGetPreference, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetPreference message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetPreference
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest.Request.GetPreference;

                /**
                 * Decodes a GetPreference message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetPreference
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest.Request.GetPreference;

                /**
                 * Verifies a GetPreference message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetPreference message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetPreference
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest.Request.GetPreference;

                /**
                 * Creates a plain object from a GetPreference message. Also converts values to other types if specified.
                 * @param message GetPreference
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesRequest.Request.GetPreference, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetPreference to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetPreference
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SetDefaultProfile. */
            interface ISetDefaultProfile {

                /** SetDefaultProfile guid */
                guid?: (string|null);
            }

            /** Represents a SetDefaultProfile. */
            class SetDefaultProfile implements ISetDefaultProfile {

                /**
                 * Constructs a new SetDefaultProfile.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesRequest.Request.ISetDefaultProfile);

                /** SetDefaultProfile guid. */
                public guid: string;

                /**
                 * Creates a new SetDefaultProfile instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SetDefaultProfile instance
                 */
                public static create(properties?: iterm2.PreferencesRequest.Request.ISetDefaultProfile): iterm2.PreferencesRequest.Request.SetDefaultProfile;

                /**
                 * Encodes the specified SetDefaultProfile message. Does not implicitly {@link iterm2.PreferencesRequest.Request.SetDefaultProfile.verify|verify} messages.
                 * @param message SetDefaultProfile message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesRequest.Request.ISetDefaultProfile, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SetDefaultProfile message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.Request.SetDefaultProfile.verify|verify} messages.
                 * @param message SetDefaultProfile message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesRequest.Request.ISetDefaultProfile, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SetDefaultProfile message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SetDefaultProfile
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest.Request.SetDefaultProfile;

                /**
                 * Decodes a SetDefaultProfile message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SetDefaultProfile
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest.Request.SetDefaultProfile;

                /**
                 * Verifies a SetDefaultProfile message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SetDefaultProfile message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SetDefaultProfile
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest.Request.SetDefaultProfile;

                /**
                 * Creates a plain object from a SetDefaultProfile message. Also converts values to other types if specified.
                 * @param message SetDefaultProfile
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesRequest.Request.SetDefaultProfile, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SetDefaultProfile to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for SetDefaultProfile
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a GetDefaultProfile. */
            interface IGetDefaultProfile {
            }

            /** Represents a GetDefaultProfile. */
            class GetDefaultProfile implements IGetDefaultProfile {

                /**
                 * Constructs a new GetDefaultProfile.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesRequest.Request.IGetDefaultProfile);

                /**
                 * Creates a new GetDefaultProfile instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetDefaultProfile instance
                 */
                public static create(properties?: iterm2.PreferencesRequest.Request.IGetDefaultProfile): iterm2.PreferencesRequest.Request.GetDefaultProfile;

                /**
                 * Encodes the specified GetDefaultProfile message. Does not implicitly {@link iterm2.PreferencesRequest.Request.GetDefaultProfile.verify|verify} messages.
                 * @param message GetDefaultProfile message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesRequest.Request.IGetDefaultProfile, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetDefaultProfile message, length delimited. Does not implicitly {@link iterm2.PreferencesRequest.Request.GetDefaultProfile.verify|verify} messages.
                 * @param message GetDefaultProfile message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesRequest.Request.IGetDefaultProfile, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetDefaultProfile message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetDefaultProfile
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesRequest.Request.GetDefaultProfile;

                /**
                 * Decodes a GetDefaultProfile message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetDefaultProfile
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesRequest.Request.GetDefaultProfile;

                /**
                 * Verifies a GetDefaultProfile message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetDefaultProfile message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetDefaultProfile
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesRequest.Request.GetDefaultProfile;

                /**
                 * Creates a plain object from a GetDefaultProfile message. Also converts values to other types if specified.
                 * @param message GetDefaultProfile
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesRequest.Request.GetDefaultProfile, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetDefaultProfile to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetDefaultProfile
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }
    }

    /** Properties of a PreferencesResponse. */
    interface IPreferencesResponse {

        /** PreferencesResponse results */
        results?: (iterm2.PreferencesResponse.IResult[]|null);
    }

    /** Represents a PreferencesResponse. */
    class PreferencesResponse implements IPreferencesResponse {

        /**
         * Constructs a new PreferencesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPreferencesResponse);

        /** PreferencesResponse results. */
        public results: iterm2.PreferencesResponse.IResult[];

        /**
         * Creates a new PreferencesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PreferencesResponse instance
         */
        public static create(properties?: iterm2.IPreferencesResponse): iterm2.PreferencesResponse;

        /**
         * Encodes the specified PreferencesResponse message. Does not implicitly {@link iterm2.PreferencesResponse.verify|verify} messages.
         * @param message PreferencesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPreferencesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PreferencesResponse message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.verify|verify} messages.
         * @param message PreferencesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPreferencesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PreferencesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PreferencesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse;

        /**
         * Decodes a PreferencesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PreferencesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse;

        /**
         * Verifies a PreferencesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PreferencesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PreferencesResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse;

        /**
         * Creates a plain object from a PreferencesResponse message. Also converts values to other types if specified.
         * @param message PreferencesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PreferencesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PreferencesResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PreferencesResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace PreferencesResponse {

        /** Properties of a Result. */
        interface IResult {

            /** Result unrecognizedRequest */
            unrecognizedRequest?: (iterm2.PreferencesResponse.Result.IUnrecognizedResult|null);

            /** Result setPreferenceResult */
            setPreferenceResult?: (iterm2.PreferencesResponse.Result.ISetPreferenceResult|null);

            /** Result getPreferenceResult */
            getPreferenceResult?: (iterm2.PreferencesResponse.Result.IGetPreferenceResult|null);

            /** Result setDefaultProfileResult */
            setDefaultProfileResult?: (iterm2.PreferencesResponse.Result.ISetDefaultProfileResult|null);

            /** Result getDefaultProfileResult */
            getDefaultProfileResult?: (iterm2.PreferencesResponse.Result.IGetDefaultProfileResult|null);
        }

        /** Represents a Result. */
        class Result implements IResult {

            /**
             * Constructs a new Result.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.PreferencesResponse.IResult);

            /** Result unrecognizedRequest. */
            public unrecognizedRequest?: (iterm2.PreferencesResponse.Result.IUnrecognizedResult|null);

            /** Result setPreferenceResult. */
            public setPreferenceResult?: (iterm2.PreferencesResponse.Result.ISetPreferenceResult|null);

            /** Result getPreferenceResult. */
            public getPreferenceResult?: (iterm2.PreferencesResponse.Result.IGetPreferenceResult|null);

            /** Result setDefaultProfileResult. */
            public setDefaultProfileResult?: (iterm2.PreferencesResponse.Result.ISetDefaultProfileResult|null);

            /** Result getDefaultProfileResult. */
            public getDefaultProfileResult?: (iterm2.PreferencesResponse.Result.IGetDefaultProfileResult|null);

            /** Result result. */
            public result?: ("unrecognizedRequest"|"setPreferenceResult"|"getPreferenceResult"|"setDefaultProfileResult"|"getDefaultProfileResult");

            /**
             * Creates a new Result instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Result instance
             */
            public static create(properties?: iterm2.PreferencesResponse.IResult): iterm2.PreferencesResponse.Result;

            /**
             * Encodes the specified Result message. Does not implicitly {@link iterm2.PreferencesResponse.Result.verify|verify} messages.
             * @param message Result message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.PreferencesResponse.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Result message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.verify|verify} messages.
             * @param message Result message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.PreferencesResponse.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Result message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Result
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result;

            /**
             * Decodes a Result message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Result
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result;

            /**
             * Verifies a Result message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Result message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Result
             */
            public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result;

            /**
             * Creates a plain object from a Result message. Also converts values to other types if specified.
             * @param message Result
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.PreferencesResponse.Result, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Result to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Result
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace Result {

            /** Properties of a SetPreferenceResult. */
            interface ISetPreferenceResult {

                /** SetPreferenceResult status */
                status?: (iterm2.PreferencesResponse.Result.SetPreferenceResult.Status|null);
            }

            /** Represents a SetPreferenceResult. */
            class SetPreferenceResult implements ISetPreferenceResult {

                /**
                 * Constructs a new SetPreferenceResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesResponse.Result.ISetPreferenceResult);

                /** SetPreferenceResult status. */
                public status: iterm2.PreferencesResponse.Result.SetPreferenceResult.Status;

                /**
                 * Creates a new SetPreferenceResult instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SetPreferenceResult instance
                 */
                public static create(properties?: iterm2.PreferencesResponse.Result.ISetPreferenceResult): iterm2.PreferencesResponse.Result.SetPreferenceResult;

                /**
                 * Encodes the specified SetPreferenceResult message. Does not implicitly {@link iterm2.PreferencesResponse.Result.SetPreferenceResult.verify|verify} messages.
                 * @param message SetPreferenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesResponse.Result.ISetPreferenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SetPreferenceResult message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.SetPreferenceResult.verify|verify} messages.
                 * @param message SetPreferenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesResponse.Result.ISetPreferenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SetPreferenceResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SetPreferenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result.SetPreferenceResult;

                /**
                 * Decodes a SetPreferenceResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SetPreferenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result.SetPreferenceResult;

                /**
                 * Verifies a SetPreferenceResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SetPreferenceResult message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SetPreferenceResult
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result.SetPreferenceResult;

                /**
                 * Creates a plain object from a SetPreferenceResult message. Also converts values to other types if specified.
                 * @param message SetPreferenceResult
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesResponse.Result.SetPreferenceResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SetPreferenceResult to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for SetPreferenceResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace SetPreferenceResult {

                /** Status enum. */
                enum Status {
                    OK = 0,
                    BAD_JSON = 1,
                    INVALID_VALUE = 2
                }
            }

            /** Properties of a GetPreferenceResult. */
            interface IGetPreferenceResult {

                /** GetPreferenceResult jsonValue */
                jsonValue?: (string|null);
            }

            /** Represents a GetPreferenceResult. */
            class GetPreferenceResult implements IGetPreferenceResult {

                /**
                 * Constructs a new GetPreferenceResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesResponse.Result.IGetPreferenceResult);

                /** GetPreferenceResult jsonValue. */
                public jsonValue: string;

                /**
                 * Creates a new GetPreferenceResult instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetPreferenceResult instance
                 */
                public static create(properties?: iterm2.PreferencesResponse.Result.IGetPreferenceResult): iterm2.PreferencesResponse.Result.GetPreferenceResult;

                /**
                 * Encodes the specified GetPreferenceResult message. Does not implicitly {@link iterm2.PreferencesResponse.Result.GetPreferenceResult.verify|verify} messages.
                 * @param message GetPreferenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesResponse.Result.IGetPreferenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetPreferenceResult message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.GetPreferenceResult.verify|verify} messages.
                 * @param message GetPreferenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesResponse.Result.IGetPreferenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetPreferenceResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetPreferenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result.GetPreferenceResult;

                /**
                 * Decodes a GetPreferenceResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetPreferenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result.GetPreferenceResult;

                /**
                 * Verifies a GetPreferenceResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetPreferenceResult message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetPreferenceResult
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result.GetPreferenceResult;

                /**
                 * Creates a plain object from a GetPreferenceResult message. Also converts values to other types if specified.
                 * @param message GetPreferenceResult
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesResponse.Result.GetPreferenceResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetPreferenceResult to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetPreferenceResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SetDefaultProfileResult. */
            interface ISetDefaultProfileResult {

                /** SetDefaultProfileResult status */
                status?: (iterm2.PreferencesResponse.Result.SetDefaultProfileResult.Status|null);
            }

            /** Represents a SetDefaultProfileResult. */
            class SetDefaultProfileResult implements ISetDefaultProfileResult {

                /**
                 * Constructs a new SetDefaultProfileResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesResponse.Result.ISetDefaultProfileResult);

                /** SetDefaultProfileResult status. */
                public status: iterm2.PreferencesResponse.Result.SetDefaultProfileResult.Status;

                /**
                 * Creates a new SetDefaultProfileResult instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SetDefaultProfileResult instance
                 */
                public static create(properties?: iterm2.PreferencesResponse.Result.ISetDefaultProfileResult): iterm2.PreferencesResponse.Result.SetDefaultProfileResult;

                /**
                 * Encodes the specified SetDefaultProfileResult message. Does not implicitly {@link iterm2.PreferencesResponse.Result.SetDefaultProfileResult.verify|verify} messages.
                 * @param message SetDefaultProfileResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesResponse.Result.ISetDefaultProfileResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SetDefaultProfileResult message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.SetDefaultProfileResult.verify|verify} messages.
                 * @param message SetDefaultProfileResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesResponse.Result.ISetDefaultProfileResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SetDefaultProfileResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SetDefaultProfileResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result.SetDefaultProfileResult;

                /**
                 * Decodes a SetDefaultProfileResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SetDefaultProfileResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result.SetDefaultProfileResult;

                /**
                 * Verifies a SetDefaultProfileResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SetDefaultProfileResult message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SetDefaultProfileResult
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result.SetDefaultProfileResult;

                /**
                 * Creates a plain object from a SetDefaultProfileResult message. Also converts values to other types if specified.
                 * @param message SetDefaultProfileResult
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesResponse.Result.SetDefaultProfileResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SetDefaultProfileResult to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for SetDefaultProfileResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace SetDefaultProfileResult {

                /** Status enum. */
                enum Status {
                    OK = 0,
                    BAD_GUID = 1
                }
            }

            /** Properties of an UnrecognizedResult. */
            interface IUnrecognizedResult {
            }

            /** Represents an UnrecognizedResult. */
            class UnrecognizedResult implements IUnrecognizedResult {

                /**
                 * Constructs a new UnrecognizedResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesResponse.Result.IUnrecognizedResult);

                /**
                 * Creates a new UnrecognizedResult instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns UnrecognizedResult instance
                 */
                public static create(properties?: iterm2.PreferencesResponse.Result.IUnrecognizedResult): iterm2.PreferencesResponse.Result.UnrecognizedResult;

                /**
                 * Encodes the specified UnrecognizedResult message. Does not implicitly {@link iterm2.PreferencesResponse.Result.UnrecognizedResult.verify|verify} messages.
                 * @param message UnrecognizedResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesResponse.Result.IUnrecognizedResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UnrecognizedResult message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.UnrecognizedResult.verify|verify} messages.
                 * @param message UnrecognizedResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesResponse.Result.IUnrecognizedResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an UnrecognizedResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns UnrecognizedResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result.UnrecognizedResult;

                /**
                 * Decodes an UnrecognizedResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns UnrecognizedResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result.UnrecognizedResult;

                /**
                 * Verifies an UnrecognizedResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an UnrecognizedResult message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns UnrecognizedResult
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result.UnrecognizedResult;

                /**
                 * Creates a plain object from an UnrecognizedResult message. Also converts values to other types if specified.
                 * @param message UnrecognizedResult
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesResponse.Result.UnrecognizedResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this UnrecognizedResult to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for UnrecognizedResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a GetDefaultProfileResult. */
            interface IGetDefaultProfileResult {

                /** GetDefaultProfileResult guid */
                guid?: (string|null);
            }

            /** Represents a GetDefaultProfileResult. */
            class GetDefaultProfileResult implements IGetDefaultProfileResult {

                /**
                 * Constructs a new GetDefaultProfileResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.PreferencesResponse.Result.IGetDefaultProfileResult);

                /** GetDefaultProfileResult guid. */
                public guid: string;

                /**
                 * Creates a new GetDefaultProfileResult instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetDefaultProfileResult instance
                 */
                public static create(properties?: iterm2.PreferencesResponse.Result.IGetDefaultProfileResult): iterm2.PreferencesResponse.Result.GetDefaultProfileResult;

                /**
                 * Encodes the specified GetDefaultProfileResult message. Does not implicitly {@link iterm2.PreferencesResponse.Result.GetDefaultProfileResult.verify|verify} messages.
                 * @param message GetDefaultProfileResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.PreferencesResponse.Result.IGetDefaultProfileResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetDefaultProfileResult message, length delimited. Does not implicitly {@link iterm2.PreferencesResponse.Result.GetDefaultProfileResult.verify|verify} messages.
                 * @param message GetDefaultProfileResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.PreferencesResponse.Result.IGetDefaultProfileResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetDefaultProfileResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetDefaultProfileResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PreferencesResponse.Result.GetDefaultProfileResult;

                /**
                 * Decodes a GetDefaultProfileResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetDefaultProfileResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PreferencesResponse.Result.GetDefaultProfileResult;

                /**
                 * Verifies a GetDefaultProfileResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetDefaultProfileResult message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetDefaultProfileResult
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.PreferencesResponse.Result.GetDefaultProfileResult;

                /**
                 * Creates a plain object from a GetDefaultProfileResult message. Also converts values to other types if specified.
                 * @param message GetDefaultProfileResult
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.PreferencesResponse.Result.GetDefaultProfileResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetDefaultProfileResult to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetDefaultProfileResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }
    }

    /** Properties of a ReorderTabsRequest. */
    interface IReorderTabsRequest {

        /** ReorderTabsRequest assignments */
        assignments?: (iterm2.ReorderTabsRequest.IAssignment[]|null);
    }

    /** Represents a ReorderTabsRequest. */
    class ReorderTabsRequest implements IReorderTabsRequest {

        /**
         * Constructs a new ReorderTabsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IReorderTabsRequest);

        /** ReorderTabsRequest assignments. */
        public assignments: iterm2.ReorderTabsRequest.IAssignment[];

        /**
         * Creates a new ReorderTabsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ReorderTabsRequest instance
         */
        public static create(properties?: iterm2.IReorderTabsRequest): iterm2.ReorderTabsRequest;

        /**
         * Encodes the specified ReorderTabsRequest message. Does not implicitly {@link iterm2.ReorderTabsRequest.verify|verify} messages.
         * @param message ReorderTabsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IReorderTabsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ReorderTabsRequest message, length delimited. Does not implicitly {@link iterm2.ReorderTabsRequest.verify|verify} messages.
         * @param message ReorderTabsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IReorderTabsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ReorderTabsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ReorderTabsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ReorderTabsRequest;

        /**
         * Decodes a ReorderTabsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ReorderTabsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ReorderTabsRequest;

        /**
         * Verifies a ReorderTabsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ReorderTabsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ReorderTabsRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ReorderTabsRequest;

        /**
         * Creates a plain object from a ReorderTabsRequest message. Also converts values to other types if specified.
         * @param message ReorderTabsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ReorderTabsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ReorderTabsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ReorderTabsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ReorderTabsRequest {

        /** Properties of an Assignment. */
        interface IAssignment {

            /** Assignment windowId */
            windowId?: (string|null);

            /** Assignment tabIds */
            tabIds?: (string[]|null);
        }

        /** Represents an Assignment. */
        class Assignment implements IAssignment {

            /**
             * Constructs a new Assignment.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ReorderTabsRequest.IAssignment);

            /** Assignment windowId. */
            public windowId: string;

            /** Assignment tabIds. */
            public tabIds: string[];

            /**
             * Creates a new Assignment instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Assignment instance
             */
            public static create(properties?: iterm2.ReorderTabsRequest.IAssignment): iterm2.ReorderTabsRequest.Assignment;

            /**
             * Encodes the specified Assignment message. Does not implicitly {@link iterm2.ReorderTabsRequest.Assignment.verify|verify} messages.
             * @param message Assignment message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ReorderTabsRequest.IAssignment, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Assignment message, length delimited. Does not implicitly {@link iterm2.ReorderTabsRequest.Assignment.verify|verify} messages.
             * @param message Assignment message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ReorderTabsRequest.IAssignment, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Assignment message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Assignment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ReorderTabsRequest.Assignment;

            /**
             * Decodes an Assignment message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Assignment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ReorderTabsRequest.Assignment;

            /**
             * Verifies an Assignment message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Assignment message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Assignment
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ReorderTabsRequest.Assignment;

            /**
             * Creates a plain object from an Assignment message. Also converts values to other types if specified.
             * @param message Assignment
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ReorderTabsRequest.Assignment, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Assignment to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Assignment
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a ReorderTabsResponse. */
    interface IReorderTabsResponse {

        /** ReorderTabsResponse status */
        status?: (iterm2.ReorderTabsResponse.Status|null);
    }

    /** Represents a ReorderTabsResponse. */
    class ReorderTabsResponse implements IReorderTabsResponse {

        /**
         * Constructs a new ReorderTabsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IReorderTabsResponse);

        /** ReorderTabsResponse status. */
        public status: iterm2.ReorderTabsResponse.Status;

        /**
         * Creates a new ReorderTabsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ReorderTabsResponse instance
         */
        public static create(properties?: iterm2.IReorderTabsResponse): iterm2.ReorderTabsResponse;

        /**
         * Encodes the specified ReorderTabsResponse message. Does not implicitly {@link iterm2.ReorderTabsResponse.verify|verify} messages.
         * @param message ReorderTabsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IReorderTabsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ReorderTabsResponse message, length delimited. Does not implicitly {@link iterm2.ReorderTabsResponse.verify|verify} messages.
         * @param message ReorderTabsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IReorderTabsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ReorderTabsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ReorderTabsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ReorderTabsResponse;

        /**
         * Decodes a ReorderTabsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ReorderTabsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ReorderTabsResponse;

        /**
         * Verifies a ReorderTabsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ReorderTabsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ReorderTabsResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ReorderTabsResponse;

        /**
         * Creates a plain object from a ReorderTabsResponse message. Also converts values to other types if specified.
         * @param message ReorderTabsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ReorderTabsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ReorderTabsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ReorderTabsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ReorderTabsResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            INVALID_ASSIGNMENT = 1,
            INVALID_WINDOW_ID = 2,
            INVALID_TAB_ID = 3
        }
    }

    /** Properties of a TmuxRequest. */
    interface ITmuxRequest {

        /** TmuxRequest listConnections */
        listConnections?: (iterm2.TmuxRequest.IListConnections|null);

        /** TmuxRequest sendCommand */
        sendCommand?: (iterm2.TmuxRequest.ISendCommand|null);

        /** TmuxRequest setWindowVisible */
        setWindowVisible?: (iterm2.TmuxRequest.ISetWindowVisible|null);

        /** TmuxRequest createWindow */
        createWindow?: (iterm2.TmuxRequest.ICreateWindow|null);
    }

    /** Represents a TmuxRequest. */
    class TmuxRequest implements ITmuxRequest {

        /**
         * Constructs a new TmuxRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ITmuxRequest);

        /** TmuxRequest listConnections. */
        public listConnections?: (iterm2.TmuxRequest.IListConnections|null);

        /** TmuxRequest sendCommand. */
        public sendCommand?: (iterm2.TmuxRequest.ISendCommand|null);

        /** TmuxRequest setWindowVisible. */
        public setWindowVisible?: (iterm2.TmuxRequest.ISetWindowVisible|null);

        /** TmuxRequest createWindow. */
        public createWindow?: (iterm2.TmuxRequest.ICreateWindow|null);

        /** TmuxRequest payload. */
        public payload?: ("listConnections"|"sendCommand"|"setWindowVisible"|"createWindow");

        /**
         * Creates a new TmuxRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TmuxRequest instance
         */
        public static create(properties?: iterm2.ITmuxRequest): iterm2.TmuxRequest;

        /**
         * Encodes the specified TmuxRequest message. Does not implicitly {@link iterm2.TmuxRequest.verify|verify} messages.
         * @param message TmuxRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ITmuxRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TmuxRequest message, length delimited. Does not implicitly {@link iterm2.TmuxRequest.verify|verify} messages.
         * @param message TmuxRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ITmuxRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TmuxRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TmuxRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxRequest;

        /**
         * Decodes a TmuxRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TmuxRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxRequest;

        /**
         * Verifies a TmuxRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TmuxRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TmuxRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.TmuxRequest;

        /**
         * Creates a plain object from a TmuxRequest message. Also converts values to other types if specified.
         * @param message TmuxRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.TmuxRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TmuxRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TmuxRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace TmuxRequest {

        /** Properties of a ListConnections. */
        interface IListConnections {
        }

        /** Represents a ListConnections. */
        class ListConnections implements IListConnections {

            /**
             * Constructs a new ListConnections.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxRequest.IListConnections);

            /**
             * Creates a new ListConnections instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListConnections instance
             */
            public static create(properties?: iterm2.TmuxRequest.IListConnections): iterm2.TmuxRequest.ListConnections;

            /**
             * Encodes the specified ListConnections message. Does not implicitly {@link iterm2.TmuxRequest.ListConnections.verify|verify} messages.
             * @param message ListConnections message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxRequest.IListConnections, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListConnections message, length delimited. Does not implicitly {@link iterm2.TmuxRequest.ListConnections.verify|verify} messages.
             * @param message ListConnections message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxRequest.IListConnections, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListConnections message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ListConnections
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxRequest.ListConnections;

            /**
             * Decodes a ListConnections message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListConnections
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxRequest.ListConnections;

            /**
             * Verifies a ListConnections message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ListConnections message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ListConnections
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxRequest.ListConnections;

            /**
             * Creates a plain object from a ListConnections message. Also converts values to other types if specified.
             * @param message ListConnections
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxRequest.ListConnections, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ListConnections to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ListConnections
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SendCommand. */
        interface ISendCommand {

            /** SendCommand connectionId */
            connectionId?: (string|null);

            /** SendCommand command */
            command?: (string|null);
        }

        /** Represents a SendCommand. */
        class SendCommand implements ISendCommand {

            /**
             * Constructs a new SendCommand.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxRequest.ISendCommand);

            /** SendCommand connectionId. */
            public connectionId: string;

            /** SendCommand command. */
            public command: string;

            /**
             * Creates a new SendCommand instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendCommand instance
             */
            public static create(properties?: iterm2.TmuxRequest.ISendCommand): iterm2.TmuxRequest.SendCommand;

            /**
             * Encodes the specified SendCommand message. Does not implicitly {@link iterm2.TmuxRequest.SendCommand.verify|verify} messages.
             * @param message SendCommand message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxRequest.ISendCommand, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendCommand message, length delimited. Does not implicitly {@link iterm2.TmuxRequest.SendCommand.verify|verify} messages.
             * @param message SendCommand message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxRequest.ISendCommand, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendCommand message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendCommand
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxRequest.SendCommand;

            /**
             * Decodes a SendCommand message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendCommand
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxRequest.SendCommand;

            /**
             * Verifies a SendCommand message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendCommand message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendCommand
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxRequest.SendCommand;

            /**
             * Creates a plain object from a SendCommand message. Also converts values to other types if specified.
             * @param message SendCommand
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxRequest.SendCommand, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendCommand to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendCommand
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SetWindowVisible. */
        interface ISetWindowVisible {

            /** SetWindowVisible connectionId */
            connectionId?: (string|null);

            /** SetWindowVisible windowId */
            windowId?: (string|null);

            /** SetWindowVisible visible */
            visible?: (boolean|null);
        }

        /** Represents a SetWindowVisible. */
        class SetWindowVisible implements ISetWindowVisible {

            /**
             * Constructs a new SetWindowVisible.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxRequest.ISetWindowVisible);

            /** SetWindowVisible connectionId. */
            public connectionId: string;

            /** SetWindowVisible windowId. */
            public windowId: string;

            /** SetWindowVisible visible. */
            public visible: boolean;

            /**
             * Creates a new SetWindowVisible instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SetWindowVisible instance
             */
            public static create(properties?: iterm2.TmuxRequest.ISetWindowVisible): iterm2.TmuxRequest.SetWindowVisible;

            /**
             * Encodes the specified SetWindowVisible message. Does not implicitly {@link iterm2.TmuxRequest.SetWindowVisible.verify|verify} messages.
             * @param message SetWindowVisible message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxRequest.ISetWindowVisible, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SetWindowVisible message, length delimited. Does not implicitly {@link iterm2.TmuxRequest.SetWindowVisible.verify|verify} messages.
             * @param message SetWindowVisible message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxRequest.ISetWindowVisible, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SetWindowVisible message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SetWindowVisible
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxRequest.SetWindowVisible;

            /**
             * Decodes a SetWindowVisible message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SetWindowVisible
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxRequest.SetWindowVisible;

            /**
             * Verifies a SetWindowVisible message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SetWindowVisible message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SetWindowVisible
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxRequest.SetWindowVisible;

            /**
             * Creates a plain object from a SetWindowVisible message. Also converts values to other types if specified.
             * @param message SetWindowVisible
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxRequest.SetWindowVisible, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SetWindowVisible to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SetWindowVisible
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CreateWindow. */
        interface ICreateWindow {

            /** CreateWindow connectionId */
            connectionId?: (string|null);

            /** CreateWindow affinity */
            affinity?: (string|null);
        }

        /** Represents a CreateWindow. */
        class CreateWindow implements ICreateWindow {

            /**
             * Constructs a new CreateWindow.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxRequest.ICreateWindow);

            /** CreateWindow connectionId. */
            public connectionId: string;

            /** CreateWindow affinity. */
            public affinity: string;

            /**
             * Creates a new CreateWindow instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateWindow instance
             */
            public static create(properties?: iterm2.TmuxRequest.ICreateWindow): iterm2.TmuxRequest.CreateWindow;

            /**
             * Encodes the specified CreateWindow message. Does not implicitly {@link iterm2.TmuxRequest.CreateWindow.verify|verify} messages.
             * @param message CreateWindow message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxRequest.ICreateWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateWindow message, length delimited. Does not implicitly {@link iterm2.TmuxRequest.CreateWindow.verify|verify} messages.
             * @param message CreateWindow message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxRequest.ICreateWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateWindow message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CreateWindow
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxRequest.CreateWindow;

            /**
             * Decodes a CreateWindow message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateWindow
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxRequest.CreateWindow;

            /**
             * Verifies a CreateWindow message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CreateWindow message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CreateWindow
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxRequest.CreateWindow;

            /**
             * Creates a plain object from a CreateWindow message. Also converts values to other types if specified.
             * @param message CreateWindow
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxRequest.CreateWindow, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CreateWindow to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CreateWindow
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a TmuxResponse. */
    interface ITmuxResponse {

        /** TmuxResponse listConnections */
        listConnections?: (iterm2.TmuxResponse.IListConnections|null);

        /** TmuxResponse sendCommand */
        sendCommand?: (iterm2.TmuxResponse.ISendCommand|null);

        /** TmuxResponse setWindowVisible */
        setWindowVisible?: (iterm2.TmuxResponse.ISetWindowVisible|null);

        /** TmuxResponse createWindow */
        createWindow?: (iterm2.TmuxResponse.ICreateWindow|null);

        /** TmuxResponse status */
        status?: (iterm2.TmuxResponse.Status|null);
    }

    /** Represents a TmuxResponse. */
    class TmuxResponse implements ITmuxResponse {

        /**
         * Constructs a new TmuxResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ITmuxResponse);

        /** TmuxResponse listConnections. */
        public listConnections?: (iterm2.TmuxResponse.IListConnections|null);

        /** TmuxResponse sendCommand. */
        public sendCommand?: (iterm2.TmuxResponse.ISendCommand|null);

        /** TmuxResponse setWindowVisible. */
        public setWindowVisible?: (iterm2.TmuxResponse.ISetWindowVisible|null);

        /** TmuxResponse createWindow. */
        public createWindow?: (iterm2.TmuxResponse.ICreateWindow|null);

        /** TmuxResponse status. */
        public status: iterm2.TmuxResponse.Status;

        /** TmuxResponse payload. */
        public payload?: ("listConnections"|"sendCommand"|"setWindowVisible"|"createWindow");

        /**
         * Creates a new TmuxResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TmuxResponse instance
         */
        public static create(properties?: iterm2.ITmuxResponse): iterm2.TmuxResponse;

        /**
         * Encodes the specified TmuxResponse message. Does not implicitly {@link iterm2.TmuxResponse.verify|verify} messages.
         * @param message TmuxResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ITmuxResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TmuxResponse message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.verify|verify} messages.
         * @param message TmuxResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ITmuxResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TmuxResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TmuxResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse;

        /**
         * Decodes a TmuxResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TmuxResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse;

        /**
         * Verifies a TmuxResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TmuxResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TmuxResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse;

        /**
         * Creates a plain object from a TmuxResponse message. Also converts values to other types if specified.
         * @param message TmuxResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.TmuxResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TmuxResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TmuxResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace TmuxResponse {

        /** Properties of a ListConnections. */
        interface IListConnections {

            /** ListConnections connections */
            connections?: (iterm2.TmuxResponse.ListConnections.IConnection[]|null);
        }

        /** Represents a ListConnections. */
        class ListConnections implements IListConnections {

            /**
             * Constructs a new ListConnections.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxResponse.IListConnections);

            /** ListConnections connections. */
            public connections: iterm2.TmuxResponse.ListConnections.IConnection[];

            /**
             * Creates a new ListConnections instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListConnections instance
             */
            public static create(properties?: iterm2.TmuxResponse.IListConnections): iterm2.TmuxResponse.ListConnections;

            /**
             * Encodes the specified ListConnections message. Does not implicitly {@link iterm2.TmuxResponse.ListConnections.verify|verify} messages.
             * @param message ListConnections message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxResponse.IListConnections, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListConnections message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.ListConnections.verify|verify} messages.
             * @param message ListConnections message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxResponse.IListConnections, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListConnections message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ListConnections
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse.ListConnections;

            /**
             * Decodes a ListConnections message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListConnections
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse.ListConnections;

            /**
             * Verifies a ListConnections message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ListConnections message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ListConnections
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse.ListConnections;

            /**
             * Creates a plain object from a ListConnections message. Also converts values to other types if specified.
             * @param message ListConnections
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxResponse.ListConnections, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ListConnections to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ListConnections
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace ListConnections {

            /** Properties of a Connection. */
            interface IConnection {

                /** Connection connectionId */
                connectionId?: (string|null);

                /** Connection owningSessionId */
                owningSessionId?: (string|null);
            }

            /** Represents a Connection. */
            class Connection implements IConnection {

                /**
                 * Constructs a new Connection.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.TmuxResponse.ListConnections.IConnection);

                /** Connection connectionId. */
                public connectionId: string;

                /** Connection owningSessionId. */
                public owningSessionId: string;

                /**
                 * Creates a new Connection instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Connection instance
                 */
                public static create(properties?: iterm2.TmuxResponse.ListConnections.IConnection): iterm2.TmuxResponse.ListConnections.Connection;

                /**
                 * Encodes the specified Connection message. Does not implicitly {@link iterm2.TmuxResponse.ListConnections.Connection.verify|verify} messages.
                 * @param message Connection message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.TmuxResponse.ListConnections.IConnection, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Connection message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.ListConnections.Connection.verify|verify} messages.
                 * @param message Connection message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.TmuxResponse.ListConnections.IConnection, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Connection message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Connection
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse.ListConnections.Connection;

                /**
                 * Decodes a Connection message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Connection
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse.ListConnections.Connection;

                /**
                 * Verifies a Connection message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Connection message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Connection
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse.ListConnections.Connection;

                /**
                 * Creates a plain object from a Connection message. Also converts values to other types if specified.
                 * @param message Connection
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.TmuxResponse.ListConnections.Connection, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Connection to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Connection
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of a SendCommand. */
        interface ISendCommand {

            /** SendCommand output */
            output?: (string|null);
        }

        /** Represents a SendCommand. */
        class SendCommand implements ISendCommand {

            /**
             * Constructs a new SendCommand.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxResponse.ISendCommand);

            /** SendCommand output. */
            public output: string;

            /**
             * Creates a new SendCommand instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendCommand instance
             */
            public static create(properties?: iterm2.TmuxResponse.ISendCommand): iterm2.TmuxResponse.SendCommand;

            /**
             * Encodes the specified SendCommand message. Does not implicitly {@link iterm2.TmuxResponse.SendCommand.verify|verify} messages.
             * @param message SendCommand message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxResponse.ISendCommand, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendCommand message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.SendCommand.verify|verify} messages.
             * @param message SendCommand message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxResponse.ISendCommand, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendCommand message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendCommand
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse.SendCommand;

            /**
             * Decodes a SendCommand message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendCommand
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse.SendCommand;

            /**
             * Verifies a SendCommand message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendCommand message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendCommand
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse.SendCommand;

            /**
             * Creates a plain object from a SendCommand message. Also converts values to other types if specified.
             * @param message SendCommand
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxResponse.SendCommand, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendCommand to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendCommand
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SetWindowVisible. */
        interface ISetWindowVisible {
        }

        /** Represents a SetWindowVisible. */
        class SetWindowVisible implements ISetWindowVisible {

            /**
             * Constructs a new SetWindowVisible.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxResponse.ISetWindowVisible);

            /**
             * Creates a new SetWindowVisible instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SetWindowVisible instance
             */
            public static create(properties?: iterm2.TmuxResponse.ISetWindowVisible): iterm2.TmuxResponse.SetWindowVisible;

            /**
             * Encodes the specified SetWindowVisible message. Does not implicitly {@link iterm2.TmuxResponse.SetWindowVisible.verify|verify} messages.
             * @param message SetWindowVisible message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxResponse.ISetWindowVisible, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SetWindowVisible message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.SetWindowVisible.verify|verify} messages.
             * @param message SetWindowVisible message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxResponse.ISetWindowVisible, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SetWindowVisible message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SetWindowVisible
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse.SetWindowVisible;

            /**
             * Decodes a SetWindowVisible message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SetWindowVisible
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse.SetWindowVisible;

            /**
             * Verifies a SetWindowVisible message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SetWindowVisible message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SetWindowVisible
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse.SetWindowVisible;

            /**
             * Creates a plain object from a SetWindowVisible message. Also converts values to other types if specified.
             * @param message SetWindowVisible
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxResponse.SetWindowVisible, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SetWindowVisible to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SetWindowVisible
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CreateWindow. */
        interface ICreateWindow {

            /** CreateWindow tabId */
            tabId?: (string|null);
        }

        /** Represents a CreateWindow. */
        class CreateWindow implements ICreateWindow {

            /**
             * Constructs a new CreateWindow.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.TmuxResponse.ICreateWindow);

            /** CreateWindow tabId. */
            public tabId: string;

            /**
             * Creates a new CreateWindow instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateWindow instance
             */
            public static create(properties?: iterm2.TmuxResponse.ICreateWindow): iterm2.TmuxResponse.CreateWindow;

            /**
             * Encodes the specified CreateWindow message. Does not implicitly {@link iterm2.TmuxResponse.CreateWindow.verify|verify} messages.
             * @param message CreateWindow message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.TmuxResponse.ICreateWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateWindow message, length delimited. Does not implicitly {@link iterm2.TmuxResponse.CreateWindow.verify|verify} messages.
             * @param message CreateWindow message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.TmuxResponse.ICreateWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateWindow message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CreateWindow
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TmuxResponse.CreateWindow;

            /**
             * Decodes a CreateWindow message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateWindow
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TmuxResponse.CreateWindow;

            /**
             * Verifies a CreateWindow message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CreateWindow message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CreateWindow
             */
            public static fromObject(object: { [k: string]: any }): iterm2.TmuxResponse.CreateWindow;

            /**
             * Creates a plain object from a CreateWindow message. Also converts values to other types if specified.
             * @param message CreateWindow
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.TmuxResponse.CreateWindow, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CreateWindow to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CreateWindow
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Status enum. */
        enum Status {
            OK = 0,
            INVALID_REQUEST = 1,
            INVALID_CONNECTION_ID = 2,
            INVALID_WINDOW_ID = 3
        }
    }

    /** Properties of a GetBroadcastDomainsRequest. */
    interface IGetBroadcastDomainsRequest {
    }

    /** Represents a GetBroadcastDomainsRequest. */
    class GetBroadcastDomainsRequest implements IGetBroadcastDomainsRequest {

        /**
         * Constructs a new GetBroadcastDomainsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetBroadcastDomainsRequest);

        /**
         * Creates a new GetBroadcastDomainsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBroadcastDomainsRequest instance
         */
        public static create(properties?: iterm2.IGetBroadcastDomainsRequest): iterm2.GetBroadcastDomainsRequest;

        /**
         * Encodes the specified GetBroadcastDomainsRequest message. Does not implicitly {@link iterm2.GetBroadcastDomainsRequest.verify|verify} messages.
         * @param message GetBroadcastDomainsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetBroadcastDomainsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBroadcastDomainsRequest message, length delimited. Does not implicitly {@link iterm2.GetBroadcastDomainsRequest.verify|verify} messages.
         * @param message GetBroadcastDomainsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetBroadcastDomainsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBroadcastDomainsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBroadcastDomainsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetBroadcastDomainsRequest;

        /**
         * Decodes a GetBroadcastDomainsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBroadcastDomainsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetBroadcastDomainsRequest;

        /**
         * Verifies a GetBroadcastDomainsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBroadcastDomainsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBroadcastDomainsRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetBroadcastDomainsRequest;

        /**
         * Creates a plain object from a GetBroadcastDomainsRequest message. Also converts values to other types if specified.
         * @param message GetBroadcastDomainsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetBroadcastDomainsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBroadcastDomainsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBroadcastDomainsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BroadcastDomain. */
    interface IBroadcastDomain {

        /** BroadcastDomain sessionIds */
        sessionIds?: (string[]|null);
    }

    /** Represents a BroadcastDomain. */
    class BroadcastDomain implements IBroadcastDomain {

        /**
         * Constructs a new BroadcastDomain.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IBroadcastDomain);

        /** BroadcastDomain sessionIds. */
        public sessionIds: string[];

        /**
         * Creates a new BroadcastDomain instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BroadcastDomain instance
         */
        public static create(properties?: iterm2.IBroadcastDomain): iterm2.BroadcastDomain;

        /**
         * Encodes the specified BroadcastDomain message. Does not implicitly {@link iterm2.BroadcastDomain.verify|verify} messages.
         * @param message BroadcastDomain message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IBroadcastDomain, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BroadcastDomain message, length delimited. Does not implicitly {@link iterm2.BroadcastDomain.verify|verify} messages.
         * @param message BroadcastDomain message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IBroadcastDomain, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BroadcastDomain message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BroadcastDomain
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.BroadcastDomain;

        /**
         * Decodes a BroadcastDomain message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BroadcastDomain
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.BroadcastDomain;

        /**
         * Verifies a BroadcastDomain message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BroadcastDomain message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BroadcastDomain
         */
        public static fromObject(object: { [k: string]: any }): iterm2.BroadcastDomain;

        /**
         * Creates a plain object from a BroadcastDomain message. Also converts values to other types if specified.
         * @param message BroadcastDomain
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.BroadcastDomain, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BroadcastDomain to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BroadcastDomain
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetBroadcastDomainsResponse. */
    interface IGetBroadcastDomainsResponse {

        /** GetBroadcastDomainsResponse broadcastDomains */
        broadcastDomains?: (iterm2.IBroadcastDomain[]|null);
    }

    /** Represents a GetBroadcastDomainsResponse. */
    class GetBroadcastDomainsResponse implements IGetBroadcastDomainsResponse {

        /**
         * Constructs a new GetBroadcastDomainsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetBroadcastDomainsResponse);

        /** GetBroadcastDomainsResponse broadcastDomains. */
        public broadcastDomains: iterm2.IBroadcastDomain[];

        /**
         * Creates a new GetBroadcastDomainsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBroadcastDomainsResponse instance
         */
        public static create(properties?: iterm2.IGetBroadcastDomainsResponse): iterm2.GetBroadcastDomainsResponse;

        /**
         * Encodes the specified GetBroadcastDomainsResponse message. Does not implicitly {@link iterm2.GetBroadcastDomainsResponse.verify|verify} messages.
         * @param message GetBroadcastDomainsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetBroadcastDomainsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBroadcastDomainsResponse message, length delimited. Does not implicitly {@link iterm2.GetBroadcastDomainsResponse.verify|verify} messages.
         * @param message GetBroadcastDomainsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetBroadcastDomainsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBroadcastDomainsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBroadcastDomainsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetBroadcastDomainsResponse;

        /**
         * Decodes a GetBroadcastDomainsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBroadcastDomainsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetBroadcastDomainsResponse;

        /**
         * Verifies a GetBroadcastDomainsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBroadcastDomainsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBroadcastDomainsResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetBroadcastDomainsResponse;

        /**
         * Creates a plain object from a GetBroadcastDomainsResponse message. Also converts values to other types if specified.
         * @param message GetBroadcastDomainsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetBroadcastDomainsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBroadcastDomainsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBroadcastDomainsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SetTabLayoutRequest. */
    interface ISetTabLayoutRequest {

        /** SetTabLayoutRequest root */
        root?: (iterm2.ISplitTreeNode|null);

        /** SetTabLayoutRequest tabId */
        tabId?: (string|null);
    }

    /** Represents a SetTabLayoutRequest. */
    class SetTabLayoutRequest implements ISetTabLayoutRequest {

        /**
         * Constructs a new SetTabLayoutRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetTabLayoutRequest);

        /** SetTabLayoutRequest root. */
        public root?: (iterm2.ISplitTreeNode|null);

        /** SetTabLayoutRequest tabId. */
        public tabId: string;

        /**
         * Creates a new SetTabLayoutRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetTabLayoutRequest instance
         */
        public static create(properties?: iterm2.ISetTabLayoutRequest): iterm2.SetTabLayoutRequest;

        /**
         * Encodes the specified SetTabLayoutRequest message. Does not implicitly {@link iterm2.SetTabLayoutRequest.verify|verify} messages.
         * @param message SetTabLayoutRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetTabLayoutRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetTabLayoutRequest message, length delimited. Does not implicitly {@link iterm2.SetTabLayoutRequest.verify|verify} messages.
         * @param message SetTabLayoutRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetTabLayoutRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetTabLayoutRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetTabLayoutRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetTabLayoutRequest;

        /**
         * Decodes a SetTabLayoutRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetTabLayoutRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetTabLayoutRequest;

        /**
         * Verifies a SetTabLayoutRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetTabLayoutRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetTabLayoutRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetTabLayoutRequest;

        /**
         * Creates a plain object from a SetTabLayoutRequest message. Also converts values to other types if specified.
         * @param message SetTabLayoutRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetTabLayoutRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetTabLayoutRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetTabLayoutRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SetTabLayoutResponse. */
    interface ISetTabLayoutResponse {

        /** SetTabLayoutResponse status */
        status?: (iterm2.SetTabLayoutResponse.Status|null);
    }

    /** Represents a SetTabLayoutResponse. */
    class SetTabLayoutResponse implements ISetTabLayoutResponse {

        /**
         * Constructs a new SetTabLayoutResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetTabLayoutResponse);

        /** SetTabLayoutResponse status. */
        public status: iterm2.SetTabLayoutResponse.Status;

        /**
         * Creates a new SetTabLayoutResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetTabLayoutResponse instance
         */
        public static create(properties?: iterm2.ISetTabLayoutResponse): iterm2.SetTabLayoutResponse;

        /**
         * Encodes the specified SetTabLayoutResponse message. Does not implicitly {@link iterm2.SetTabLayoutResponse.verify|verify} messages.
         * @param message SetTabLayoutResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetTabLayoutResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetTabLayoutResponse message, length delimited. Does not implicitly {@link iterm2.SetTabLayoutResponse.verify|verify} messages.
         * @param message SetTabLayoutResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetTabLayoutResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetTabLayoutResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetTabLayoutResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetTabLayoutResponse;

        /**
         * Decodes a SetTabLayoutResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetTabLayoutResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetTabLayoutResponse;

        /**
         * Verifies a SetTabLayoutResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetTabLayoutResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetTabLayoutResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetTabLayoutResponse;

        /**
         * Creates a plain object from a SetTabLayoutResponse message. Also converts values to other types if specified.
         * @param message SetTabLayoutResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetTabLayoutResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetTabLayoutResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetTabLayoutResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SetTabLayoutResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            BAD_TAB_ID = 1,
            WRONG_TREE = 2,
            INVALID_SIZE = 3
        }
    }

    /** Properties of a MenuItemRequest. */
    interface IMenuItemRequest {

        /** MenuItemRequest identifier */
        identifier?: (string|null);

        /** MenuItemRequest queryOnly */
        queryOnly?: (boolean|null);
    }

    /** Represents a MenuItemRequest. */
    class MenuItemRequest implements IMenuItemRequest {

        /**
         * Constructs a new MenuItemRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IMenuItemRequest);

        /** MenuItemRequest identifier. */
        public identifier: string;

        /** MenuItemRequest queryOnly. */
        public queryOnly: boolean;

        /**
         * Creates a new MenuItemRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MenuItemRequest instance
         */
        public static create(properties?: iterm2.IMenuItemRequest): iterm2.MenuItemRequest;

        /**
         * Encodes the specified MenuItemRequest message. Does not implicitly {@link iterm2.MenuItemRequest.verify|verify} messages.
         * @param message MenuItemRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IMenuItemRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MenuItemRequest message, length delimited. Does not implicitly {@link iterm2.MenuItemRequest.verify|verify} messages.
         * @param message MenuItemRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IMenuItemRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MenuItemRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MenuItemRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.MenuItemRequest;

        /**
         * Decodes a MenuItemRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MenuItemRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.MenuItemRequest;

        /**
         * Verifies a MenuItemRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MenuItemRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MenuItemRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.MenuItemRequest;

        /**
         * Creates a plain object from a MenuItemRequest message. Also converts values to other types if specified.
         * @param message MenuItemRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.MenuItemRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MenuItemRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MenuItemRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a MenuItemResponse. */
    interface IMenuItemResponse {

        /** MenuItemResponse status */
        status?: (iterm2.MenuItemResponse.Status|null);

        /** MenuItemResponse checked */
        checked?: (boolean|null);

        /** MenuItemResponse enabled */
        enabled?: (boolean|null);
    }

    /** Represents a MenuItemResponse. */
    class MenuItemResponse implements IMenuItemResponse {

        /**
         * Constructs a new MenuItemResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IMenuItemResponse);

        /** MenuItemResponse status. */
        public status: iterm2.MenuItemResponse.Status;

        /** MenuItemResponse checked. */
        public checked: boolean;

        /** MenuItemResponse enabled. */
        public enabled: boolean;

        /**
         * Creates a new MenuItemResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MenuItemResponse instance
         */
        public static create(properties?: iterm2.IMenuItemResponse): iterm2.MenuItemResponse;

        /**
         * Encodes the specified MenuItemResponse message. Does not implicitly {@link iterm2.MenuItemResponse.verify|verify} messages.
         * @param message MenuItemResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IMenuItemResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MenuItemResponse message, length delimited. Does not implicitly {@link iterm2.MenuItemResponse.verify|verify} messages.
         * @param message MenuItemResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IMenuItemResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MenuItemResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MenuItemResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.MenuItemResponse;

        /**
         * Decodes a MenuItemResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MenuItemResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.MenuItemResponse;

        /**
         * Verifies a MenuItemResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MenuItemResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MenuItemResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.MenuItemResponse;

        /**
         * Creates a plain object from a MenuItemResponse message. Also converts values to other types if specified.
         * @param message MenuItemResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.MenuItemResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MenuItemResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MenuItemResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace MenuItemResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            BAD_IDENTIFIER = 1,
            DISABLED = 2
        }
    }

    /** Properties of a RestartSessionRequest. */
    interface IRestartSessionRequest {

        /** RestartSessionRequest sessionId */
        sessionId?: (string|null);

        /** RestartSessionRequest onlyIfExited */
        onlyIfExited?: (boolean|null);
    }

    /** Represents a RestartSessionRequest. */
    class RestartSessionRequest implements IRestartSessionRequest {

        /**
         * Constructs a new RestartSessionRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRestartSessionRequest);

        /** RestartSessionRequest sessionId. */
        public sessionId: string;

        /** RestartSessionRequest onlyIfExited. */
        public onlyIfExited: boolean;

        /**
         * Creates a new RestartSessionRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RestartSessionRequest instance
         */
        public static create(properties?: iterm2.IRestartSessionRequest): iterm2.RestartSessionRequest;

        /**
         * Encodes the specified RestartSessionRequest message. Does not implicitly {@link iterm2.RestartSessionRequest.verify|verify} messages.
         * @param message RestartSessionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRestartSessionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RestartSessionRequest message, length delimited. Does not implicitly {@link iterm2.RestartSessionRequest.verify|verify} messages.
         * @param message RestartSessionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRestartSessionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RestartSessionRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RestartSessionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RestartSessionRequest;

        /**
         * Decodes a RestartSessionRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RestartSessionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RestartSessionRequest;

        /**
         * Verifies a RestartSessionRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RestartSessionRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RestartSessionRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RestartSessionRequest;

        /**
         * Creates a plain object from a RestartSessionRequest message. Also converts values to other types if specified.
         * @param message RestartSessionRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RestartSessionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RestartSessionRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RestartSessionRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RestartSessionResponse. */
    interface IRestartSessionResponse {

        /** RestartSessionResponse status */
        status?: (iterm2.RestartSessionResponse.Status|null);
    }

    /** Represents a RestartSessionResponse. */
    class RestartSessionResponse implements IRestartSessionResponse {

        /**
         * Constructs a new RestartSessionResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRestartSessionResponse);

        /** RestartSessionResponse status. */
        public status: iterm2.RestartSessionResponse.Status;

        /**
         * Creates a new RestartSessionResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RestartSessionResponse instance
         */
        public static create(properties?: iterm2.IRestartSessionResponse): iterm2.RestartSessionResponse;

        /**
         * Encodes the specified RestartSessionResponse message. Does not implicitly {@link iterm2.RestartSessionResponse.verify|verify} messages.
         * @param message RestartSessionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRestartSessionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RestartSessionResponse message, length delimited. Does not implicitly {@link iterm2.RestartSessionResponse.verify|verify} messages.
         * @param message RestartSessionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRestartSessionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RestartSessionResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RestartSessionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RestartSessionResponse;

        /**
         * Decodes a RestartSessionResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RestartSessionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RestartSessionResponse;

        /**
         * Verifies a RestartSessionResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RestartSessionResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RestartSessionResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RestartSessionResponse;

        /**
         * Creates a plain object from a RestartSessionResponse message. Also converts values to other types if specified.
         * @param message RestartSessionResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RestartSessionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RestartSessionResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RestartSessionResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace RestartSessionResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            SESSION_NOT_RESTARTABLE = 2
        }
    }

    /** Properties of a ServerOriginatedRPCResultRequest. */
    interface IServerOriginatedRPCResultRequest {

        /** ServerOriginatedRPCResultRequest requestId */
        requestId?: (string|null);

        /** ServerOriginatedRPCResultRequest jsonException */
        jsonException?: (string|null);

        /** ServerOriginatedRPCResultRequest jsonValue */
        jsonValue?: (string|null);
    }

    /** Represents a ServerOriginatedRPCResultRequest. */
    class ServerOriginatedRPCResultRequest implements IServerOriginatedRPCResultRequest {

        /**
         * Constructs a new ServerOriginatedRPCResultRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IServerOriginatedRPCResultRequest);

        /** ServerOriginatedRPCResultRequest requestId. */
        public requestId: string;

        /** ServerOriginatedRPCResultRequest jsonException. */
        public jsonException?: (string|null);

        /** ServerOriginatedRPCResultRequest jsonValue. */
        public jsonValue?: (string|null);

        /** ServerOriginatedRPCResultRequest result. */
        public result?: ("jsonException"|"jsonValue");

        /**
         * Creates a new ServerOriginatedRPCResultRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerOriginatedRPCResultRequest instance
         */
        public static create(properties?: iterm2.IServerOriginatedRPCResultRequest): iterm2.ServerOriginatedRPCResultRequest;

        /**
         * Encodes the specified ServerOriginatedRPCResultRequest message. Does not implicitly {@link iterm2.ServerOriginatedRPCResultRequest.verify|verify} messages.
         * @param message ServerOriginatedRPCResultRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IServerOriginatedRPCResultRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerOriginatedRPCResultRequest message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedRPCResultRequest.verify|verify} messages.
         * @param message ServerOriginatedRPCResultRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IServerOriginatedRPCResultRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerOriginatedRPCResultRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerOriginatedRPCResultRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedRPCResultRequest;

        /**
         * Decodes a ServerOriginatedRPCResultRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerOriginatedRPCResultRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedRPCResultRequest;

        /**
         * Verifies a ServerOriginatedRPCResultRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerOriginatedRPCResultRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerOriginatedRPCResultRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedRPCResultRequest;

        /**
         * Creates a plain object from a ServerOriginatedRPCResultRequest message. Also converts values to other types if specified.
         * @param message ServerOriginatedRPCResultRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ServerOriginatedRPCResultRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerOriginatedRPCResultRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ServerOriginatedRPCResultRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ServerOriginatedRPCResultResponse. */
    interface IServerOriginatedRPCResultResponse {
    }

    /** Represents a ServerOriginatedRPCResultResponse. */
    class ServerOriginatedRPCResultResponse implements IServerOriginatedRPCResultResponse {

        /**
         * Constructs a new ServerOriginatedRPCResultResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IServerOriginatedRPCResultResponse);

        /**
         * Creates a new ServerOriginatedRPCResultResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerOriginatedRPCResultResponse instance
         */
        public static create(properties?: iterm2.IServerOriginatedRPCResultResponse): iterm2.ServerOriginatedRPCResultResponse;

        /**
         * Encodes the specified ServerOriginatedRPCResultResponse message. Does not implicitly {@link iterm2.ServerOriginatedRPCResultResponse.verify|verify} messages.
         * @param message ServerOriginatedRPCResultResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IServerOriginatedRPCResultResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerOriginatedRPCResultResponse message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedRPCResultResponse.verify|verify} messages.
         * @param message ServerOriginatedRPCResultResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IServerOriginatedRPCResultResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerOriginatedRPCResultResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerOriginatedRPCResultResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedRPCResultResponse;

        /**
         * Decodes a ServerOriginatedRPCResultResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerOriginatedRPCResultResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedRPCResultResponse;

        /**
         * Verifies a ServerOriginatedRPCResultResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerOriginatedRPCResultResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerOriginatedRPCResultResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedRPCResultResponse;

        /**
         * Creates a plain object from a ServerOriginatedRPCResultResponse message. Also converts values to other types if specified.
         * @param message ServerOriginatedRPCResultResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ServerOriginatedRPCResultResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerOriginatedRPCResultResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ServerOriginatedRPCResultResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListProfilesRequest. */
    interface IListProfilesRequest {

        /** ListProfilesRequest properties */
        properties?: (string[]|null);

        /** ListProfilesRequest guids */
        guids?: (string[]|null);
    }

    /** Represents a ListProfilesRequest. */
    class ListProfilesRequest implements IListProfilesRequest {

        /**
         * Constructs a new ListProfilesRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListProfilesRequest);

        /** ListProfilesRequest properties. */
        public properties: string[];

        /** ListProfilesRequest guids. */
        public guids: string[];

        /**
         * Creates a new ListProfilesRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListProfilesRequest instance
         */
        public static create(properties?: iterm2.IListProfilesRequest): iterm2.ListProfilesRequest;

        /**
         * Encodes the specified ListProfilesRequest message. Does not implicitly {@link iterm2.ListProfilesRequest.verify|verify} messages.
         * @param message ListProfilesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListProfilesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListProfilesRequest message, length delimited. Does not implicitly {@link iterm2.ListProfilesRequest.verify|verify} messages.
         * @param message ListProfilesRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListProfilesRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListProfilesRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListProfilesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListProfilesRequest;

        /**
         * Decodes a ListProfilesRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListProfilesRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListProfilesRequest;

        /**
         * Verifies a ListProfilesRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListProfilesRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListProfilesRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListProfilesRequest;

        /**
         * Creates a plain object from a ListProfilesRequest message. Also converts values to other types if specified.
         * @param message ListProfilesRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListProfilesRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListProfilesRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListProfilesRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListProfilesResponse. */
    interface IListProfilesResponse {

        /** ListProfilesResponse profiles */
        profiles?: (iterm2.ListProfilesResponse.IProfile[]|null);
    }

    /** Represents a ListProfilesResponse. */
    class ListProfilesResponse implements IListProfilesResponse {

        /**
         * Constructs a new ListProfilesResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListProfilesResponse);

        /** ListProfilesResponse profiles. */
        public profiles: iterm2.ListProfilesResponse.IProfile[];

        /**
         * Creates a new ListProfilesResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListProfilesResponse instance
         */
        public static create(properties?: iterm2.IListProfilesResponse): iterm2.ListProfilesResponse;

        /**
         * Encodes the specified ListProfilesResponse message. Does not implicitly {@link iterm2.ListProfilesResponse.verify|verify} messages.
         * @param message ListProfilesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListProfilesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListProfilesResponse message, length delimited. Does not implicitly {@link iterm2.ListProfilesResponse.verify|verify} messages.
         * @param message ListProfilesResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListProfilesResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListProfilesResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListProfilesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListProfilesResponse;

        /**
         * Decodes a ListProfilesResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListProfilesResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListProfilesResponse;

        /**
         * Verifies a ListProfilesResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListProfilesResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListProfilesResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListProfilesResponse;

        /**
         * Creates a plain object from a ListProfilesResponse message. Also converts values to other types if specified.
         * @param message ListProfilesResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListProfilesResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListProfilesResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListProfilesResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ListProfilesResponse {

        /** Properties of a Profile. */
        interface IProfile {

            /** Profile properties */
            properties?: (iterm2.IProfileProperty[]|null);
        }

        /** Represents a Profile. */
        class Profile implements IProfile {

            /**
             * Constructs a new Profile.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ListProfilesResponse.IProfile);

            /** Profile properties. */
            public properties: iterm2.IProfileProperty[];

            /**
             * Creates a new Profile instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Profile instance
             */
            public static create(properties?: iterm2.ListProfilesResponse.IProfile): iterm2.ListProfilesResponse.Profile;

            /**
             * Encodes the specified Profile message. Does not implicitly {@link iterm2.ListProfilesResponse.Profile.verify|verify} messages.
             * @param message Profile message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ListProfilesResponse.IProfile, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Profile message, length delimited. Does not implicitly {@link iterm2.ListProfilesResponse.Profile.verify|verify} messages.
             * @param message Profile message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ListProfilesResponse.IProfile, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Profile message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Profile
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListProfilesResponse.Profile;

            /**
             * Decodes a Profile message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Profile
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListProfilesResponse.Profile;

            /**
             * Verifies a Profile message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Profile message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Profile
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ListProfilesResponse.Profile;

            /**
             * Creates a plain object from a Profile message. Also converts values to other types if specified.
             * @param message Profile
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ListProfilesResponse.Profile, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Profile to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Profile
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a FocusRequest. */
    interface IFocusRequest {
    }

    /** Represents a FocusRequest. */
    class FocusRequest implements IFocusRequest {

        /**
         * Constructs a new FocusRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IFocusRequest);

        /**
         * Creates a new FocusRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FocusRequest instance
         */
        public static create(properties?: iterm2.IFocusRequest): iterm2.FocusRequest;

        /**
         * Encodes the specified FocusRequest message. Does not implicitly {@link iterm2.FocusRequest.verify|verify} messages.
         * @param message FocusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IFocusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FocusRequest message, length delimited. Does not implicitly {@link iterm2.FocusRequest.verify|verify} messages.
         * @param message FocusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IFocusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FocusRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FocusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.FocusRequest;

        /**
         * Decodes a FocusRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FocusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.FocusRequest;

        /**
         * Verifies a FocusRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FocusRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FocusRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.FocusRequest;

        /**
         * Creates a plain object from a FocusRequest message. Also converts values to other types if specified.
         * @param message FocusRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.FocusRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FocusRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FocusRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a FocusResponse. */
    interface IFocusResponse {

        /** FocusResponse notifications */
        notifications?: (iterm2.IFocusChangedNotification[]|null);
    }

    /** Represents a FocusResponse. */
    class FocusResponse implements IFocusResponse {

        /**
         * Constructs a new FocusResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IFocusResponse);

        /** FocusResponse notifications. */
        public notifications: iterm2.IFocusChangedNotification[];

        /**
         * Creates a new FocusResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FocusResponse instance
         */
        public static create(properties?: iterm2.IFocusResponse): iterm2.FocusResponse;

        /**
         * Encodes the specified FocusResponse message. Does not implicitly {@link iterm2.FocusResponse.verify|verify} messages.
         * @param message FocusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IFocusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FocusResponse message, length delimited. Does not implicitly {@link iterm2.FocusResponse.verify|verify} messages.
         * @param message FocusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IFocusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FocusResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FocusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.FocusResponse;

        /**
         * Decodes a FocusResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FocusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.FocusResponse;

        /**
         * Verifies a FocusResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FocusResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FocusResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.FocusResponse;

        /**
         * Creates a plain object from a FocusResponse message. Also converts values to other types if specified.
         * @param message FocusResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.FocusResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FocusResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FocusResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SavedArrangementRequest. */
    interface ISavedArrangementRequest {

        /** SavedArrangementRequest name */
        name?: (string|null);

        /** SavedArrangementRequest action */
        action?: (iterm2.SavedArrangementRequest.Action|null);

        /** SavedArrangementRequest windowId */
        windowId?: (string|null);
    }

    /** Represents a SavedArrangementRequest. */
    class SavedArrangementRequest implements ISavedArrangementRequest {

        /**
         * Constructs a new SavedArrangementRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISavedArrangementRequest);

        /** SavedArrangementRequest name. */
        public name: string;

        /** SavedArrangementRequest action. */
        public action: iterm2.SavedArrangementRequest.Action;

        /** SavedArrangementRequest windowId. */
        public windowId: string;

        /**
         * Creates a new SavedArrangementRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SavedArrangementRequest instance
         */
        public static create(properties?: iterm2.ISavedArrangementRequest): iterm2.SavedArrangementRequest;

        /**
         * Encodes the specified SavedArrangementRequest message. Does not implicitly {@link iterm2.SavedArrangementRequest.verify|verify} messages.
         * @param message SavedArrangementRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISavedArrangementRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SavedArrangementRequest message, length delimited. Does not implicitly {@link iterm2.SavedArrangementRequest.verify|verify} messages.
         * @param message SavedArrangementRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISavedArrangementRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SavedArrangementRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SavedArrangementRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SavedArrangementRequest;

        /**
         * Decodes a SavedArrangementRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SavedArrangementRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SavedArrangementRequest;

        /**
         * Verifies a SavedArrangementRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SavedArrangementRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SavedArrangementRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SavedArrangementRequest;

        /**
         * Creates a plain object from a SavedArrangementRequest message. Also converts values to other types if specified.
         * @param message SavedArrangementRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SavedArrangementRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SavedArrangementRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SavedArrangementRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SavedArrangementRequest {

        /** Action enum. */
        enum Action {
            RESTORE = 0,
            SAVE = 1,
            LIST = 2
        }
    }

    /** Properties of a SavedArrangementResponse. */
    interface ISavedArrangementResponse {

        /** SavedArrangementResponse status */
        status?: (iterm2.SavedArrangementResponse.Status|null);

        /** SavedArrangementResponse names */
        names?: (string[]|null);
    }

    /** Represents a SavedArrangementResponse. */
    class SavedArrangementResponse implements ISavedArrangementResponse {

        /**
         * Constructs a new SavedArrangementResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISavedArrangementResponse);

        /** SavedArrangementResponse status. */
        public status: iterm2.SavedArrangementResponse.Status;

        /** SavedArrangementResponse names. */
        public names: string[];

        /**
         * Creates a new SavedArrangementResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SavedArrangementResponse instance
         */
        public static create(properties?: iterm2.ISavedArrangementResponse): iterm2.SavedArrangementResponse;

        /**
         * Encodes the specified SavedArrangementResponse message. Does not implicitly {@link iterm2.SavedArrangementResponse.verify|verify} messages.
         * @param message SavedArrangementResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISavedArrangementResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SavedArrangementResponse message, length delimited. Does not implicitly {@link iterm2.SavedArrangementResponse.verify|verify} messages.
         * @param message SavedArrangementResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISavedArrangementResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SavedArrangementResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SavedArrangementResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SavedArrangementResponse;

        /**
         * Decodes a SavedArrangementResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SavedArrangementResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SavedArrangementResponse;

        /**
         * Verifies a SavedArrangementResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SavedArrangementResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SavedArrangementResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SavedArrangementResponse;

        /**
         * Creates a plain object from a SavedArrangementResponse message. Also converts values to other types if specified.
         * @param message SavedArrangementResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SavedArrangementResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SavedArrangementResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SavedArrangementResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SavedArrangementResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            ARRANGEMENT_NOT_FOUND = 1,
            WINDOW_NOT_FOUND = 2,
            REQUEST_MALFORMED = 3
        }
    }

    /** Properties of a VariableRequest. */
    interface IVariableRequest {

        /** VariableRequest sessionId */
        sessionId?: (string|null);

        /** VariableRequest tabId */
        tabId?: (string|null);

        /** VariableRequest app */
        app?: (boolean|null);

        /** VariableRequest windowId */
        windowId?: (string|null);

        /** VariableRequest set */
        set?: (iterm2.VariableRequest.ISet[]|null);

        /** VariableRequest get */
        get?: (string[]|null);
    }

    /** Represents a VariableRequest. */
    class VariableRequest implements IVariableRequest {

        /**
         * Constructs a new VariableRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IVariableRequest);

        /** VariableRequest sessionId. */
        public sessionId?: (string|null);

        /** VariableRequest tabId. */
        public tabId?: (string|null);

        /** VariableRequest app. */
        public app?: (boolean|null);

        /** VariableRequest windowId. */
        public windowId?: (string|null);

        /** VariableRequest set. */
        public set: iterm2.VariableRequest.ISet[];

        /** VariableRequest get. */
        public get: string[];

        /** VariableRequest scope. */
        public scope?: ("sessionId"|"tabId"|"app"|"windowId");

        /**
         * Creates a new VariableRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VariableRequest instance
         */
        public static create(properties?: iterm2.IVariableRequest): iterm2.VariableRequest;

        /**
         * Encodes the specified VariableRequest message. Does not implicitly {@link iterm2.VariableRequest.verify|verify} messages.
         * @param message VariableRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IVariableRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified VariableRequest message, length delimited. Does not implicitly {@link iterm2.VariableRequest.verify|verify} messages.
         * @param message VariableRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IVariableRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VariableRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VariableRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.VariableRequest;

        /**
         * Decodes a VariableRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns VariableRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.VariableRequest;

        /**
         * Verifies a VariableRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a VariableRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns VariableRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.VariableRequest;

        /**
         * Creates a plain object from a VariableRequest message. Also converts values to other types if specified.
         * @param message VariableRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.VariableRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this VariableRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for VariableRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace VariableRequest {

        /** Properties of a Set. */
        interface ISet {

            /** Set name */
            name?: (string|null);

            /** Set value */
            value?: (string|null);
        }

        /** Represents a Set. */
        class Set implements ISet {

            /**
             * Constructs a new Set.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.VariableRequest.ISet);

            /** Set name. */
            public name: string;

            /** Set value. */
            public value: string;

            /**
             * Creates a new Set instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Set instance
             */
            public static create(properties?: iterm2.VariableRequest.ISet): iterm2.VariableRequest.Set;

            /**
             * Encodes the specified Set message. Does not implicitly {@link iterm2.VariableRequest.Set.verify|verify} messages.
             * @param message Set message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.VariableRequest.ISet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Set message, length delimited. Does not implicitly {@link iterm2.VariableRequest.Set.verify|verify} messages.
             * @param message Set message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.VariableRequest.ISet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Set message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Set
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.VariableRequest.Set;

            /**
             * Decodes a Set message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Set
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.VariableRequest.Set;

            /**
             * Verifies a Set message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Set message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Set
             */
            public static fromObject(object: { [k: string]: any }): iterm2.VariableRequest.Set;

            /**
             * Creates a plain object from a Set message. Also converts values to other types if specified.
             * @param message Set
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.VariableRequest.Set, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Set to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Set
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a VariableResponse. */
    interface IVariableResponse {

        /** VariableResponse status */
        status?: (iterm2.VariableResponse.Status|null);

        /** VariableResponse values */
        values?: (string[]|null);
    }

    /** Represents a VariableResponse. */
    class VariableResponse implements IVariableResponse {

        /**
         * Constructs a new VariableResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IVariableResponse);

        /** VariableResponse status. */
        public status: iterm2.VariableResponse.Status;

        /** VariableResponse values. */
        public values: string[];

        /**
         * Creates a new VariableResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VariableResponse instance
         */
        public static create(properties?: iterm2.IVariableResponse): iterm2.VariableResponse;

        /**
         * Encodes the specified VariableResponse message. Does not implicitly {@link iterm2.VariableResponse.verify|verify} messages.
         * @param message VariableResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IVariableResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified VariableResponse message, length delimited. Does not implicitly {@link iterm2.VariableResponse.verify|verify} messages.
         * @param message VariableResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IVariableResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VariableResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VariableResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.VariableResponse;

        /**
         * Decodes a VariableResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns VariableResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.VariableResponse;

        /**
         * Verifies a VariableResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a VariableResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns VariableResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.VariableResponse;

        /**
         * Creates a plain object from a VariableResponse message. Also converts values to other types if specified.
         * @param message VariableResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.VariableResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this VariableResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for VariableResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace VariableResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            INVALID_NAME = 2,
            MISSING_SCOPE = 3,
            TAB_NOT_FOUND = 4,
            MULTI_GET_DISALLOWED = 5,
            WINDOW_NOT_FOUND = 6
        }
    }

    /** Properties of an ActivateRequest. */
    interface IActivateRequest {

        /** ActivateRequest windowId */
        windowId?: (string|null);

        /** ActivateRequest tabId */
        tabId?: (string|null);

        /** ActivateRequest sessionId */
        sessionId?: (string|null);

        /** ActivateRequest orderWindowFront */
        orderWindowFront?: (boolean|null);

        /** ActivateRequest selectTab */
        selectTab?: (boolean|null);

        /** ActivateRequest selectSession */
        selectSession?: (boolean|null);

        /** ActivateRequest activateApp */
        activateApp?: (iterm2.ActivateRequest.IApp|null);
    }

    /** Represents an ActivateRequest. */
    class ActivateRequest implements IActivateRequest {

        /**
         * Constructs a new ActivateRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IActivateRequest);

        /** ActivateRequest windowId. */
        public windowId?: (string|null);

        /** ActivateRequest tabId. */
        public tabId?: (string|null);

        /** ActivateRequest sessionId. */
        public sessionId?: (string|null);

        /** ActivateRequest orderWindowFront. */
        public orderWindowFront: boolean;

        /** ActivateRequest selectTab. */
        public selectTab: boolean;

        /** ActivateRequest selectSession. */
        public selectSession: boolean;

        /** ActivateRequest activateApp. */
        public activateApp?: (iterm2.ActivateRequest.IApp|null);

        /** ActivateRequest identifier. */
        public identifier?: ("windowId"|"tabId"|"sessionId");

        /**
         * Creates a new ActivateRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ActivateRequest instance
         */
        public static create(properties?: iterm2.IActivateRequest): iterm2.ActivateRequest;

        /**
         * Encodes the specified ActivateRequest message. Does not implicitly {@link iterm2.ActivateRequest.verify|verify} messages.
         * @param message ActivateRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IActivateRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ActivateRequest message, length delimited. Does not implicitly {@link iterm2.ActivateRequest.verify|verify} messages.
         * @param message ActivateRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IActivateRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ActivateRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ActivateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ActivateRequest;

        /**
         * Decodes an ActivateRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ActivateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ActivateRequest;

        /**
         * Verifies an ActivateRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ActivateRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ActivateRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ActivateRequest;

        /**
         * Creates a plain object from an ActivateRequest message. Also converts values to other types if specified.
         * @param message ActivateRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ActivateRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ActivateRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ActivateRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ActivateRequest {

        /** Properties of an App. */
        interface IApp {

            /** App raiseAllWindows */
            raiseAllWindows?: (boolean|null);

            /** App ignoringOtherApps */
            ignoringOtherApps?: (boolean|null);
        }

        /** Represents an App. */
        class App implements IApp {

            /**
             * Constructs a new App.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ActivateRequest.IApp);

            /** App raiseAllWindows. */
            public raiseAllWindows: boolean;

            /** App ignoringOtherApps. */
            public ignoringOtherApps: boolean;

            /**
             * Creates a new App instance using the specified properties.
             * @param [properties] Properties to set
             * @returns App instance
             */
            public static create(properties?: iterm2.ActivateRequest.IApp): iterm2.ActivateRequest.App;

            /**
             * Encodes the specified App message. Does not implicitly {@link iterm2.ActivateRequest.App.verify|verify} messages.
             * @param message App message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ActivateRequest.IApp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified App message, length delimited. Does not implicitly {@link iterm2.ActivateRequest.App.verify|verify} messages.
             * @param message App message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ActivateRequest.IApp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an App message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns App
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ActivateRequest.App;

            /**
             * Decodes an App message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns App
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ActivateRequest.App;

            /**
             * Verifies an App message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an App message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns App
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ActivateRequest.App;

            /**
             * Creates a plain object from an App message. Also converts values to other types if specified.
             * @param message App
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ActivateRequest.App, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this App to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for App
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of an ActivateResponse. */
    interface IActivateResponse {

        /** ActivateResponse status */
        status?: (iterm2.ActivateResponse.Status|null);
    }

    /** Represents an ActivateResponse. */
    class ActivateResponse implements IActivateResponse {

        /**
         * Constructs a new ActivateResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IActivateResponse);

        /** ActivateResponse status. */
        public status: iterm2.ActivateResponse.Status;

        /**
         * Creates a new ActivateResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ActivateResponse instance
         */
        public static create(properties?: iterm2.IActivateResponse): iterm2.ActivateResponse;

        /**
         * Encodes the specified ActivateResponse message. Does not implicitly {@link iterm2.ActivateResponse.verify|verify} messages.
         * @param message ActivateResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IActivateResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ActivateResponse message, length delimited. Does not implicitly {@link iterm2.ActivateResponse.verify|verify} messages.
         * @param message ActivateResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IActivateResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ActivateResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ActivateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ActivateResponse;

        /**
         * Decodes an ActivateResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ActivateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ActivateResponse;

        /**
         * Verifies an ActivateResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ActivateResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ActivateResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ActivateResponse;

        /**
         * Creates a plain object from an ActivateResponse message. Also converts values to other types if specified.
         * @param message ActivateResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ActivateResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ActivateResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ActivateResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ActivateResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            BAD_IDENTIFIER = 1,
            INVALID_OPTION = 2
        }
    }

    /** Properties of an InjectRequest. */
    interface IInjectRequest {

        /** InjectRequest sessionId */
        sessionId?: (string[]|null);

        /** InjectRequest data */
        data?: (Uint8Array|null);
    }

    /** Represents an InjectRequest. */
    class InjectRequest implements IInjectRequest {

        /**
         * Constructs a new InjectRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IInjectRequest);

        /** InjectRequest sessionId. */
        public sessionId: string[];

        /** InjectRequest data. */
        public data: Uint8Array;

        /**
         * Creates a new InjectRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InjectRequest instance
         */
        public static create(properties?: iterm2.IInjectRequest): iterm2.InjectRequest;

        /**
         * Encodes the specified InjectRequest message. Does not implicitly {@link iterm2.InjectRequest.verify|verify} messages.
         * @param message InjectRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IInjectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InjectRequest message, length delimited. Does not implicitly {@link iterm2.InjectRequest.verify|verify} messages.
         * @param message InjectRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IInjectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InjectRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InjectRequest;

        /**
         * Decodes an InjectRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InjectRequest;

        /**
         * Verifies an InjectRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InjectRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InjectRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.InjectRequest;

        /**
         * Creates a plain object from an InjectRequest message. Also converts values to other types if specified.
         * @param message InjectRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.InjectRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InjectRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InjectRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an InjectResponse. */
    interface IInjectResponse {

        /** InjectResponse status */
        status?: (iterm2.InjectResponse.Status[]|null);
    }

    /** Represents an InjectResponse. */
    class InjectResponse implements IInjectResponse {

        /**
         * Constructs a new InjectResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IInjectResponse);

        /** InjectResponse status. */
        public status: iterm2.InjectResponse.Status[];

        /**
         * Creates a new InjectResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InjectResponse instance
         */
        public static create(properties?: iterm2.IInjectResponse): iterm2.InjectResponse;

        /**
         * Encodes the specified InjectResponse message. Does not implicitly {@link iterm2.InjectResponse.verify|verify} messages.
         * @param message InjectResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IInjectResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified InjectResponse message, length delimited. Does not implicitly {@link iterm2.InjectResponse.verify|verify} messages.
         * @param message InjectResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IInjectResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InjectResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns InjectResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.InjectResponse;

        /**
         * Decodes an InjectResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns InjectResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.InjectResponse;

        /**
         * Verifies an InjectResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an InjectResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns InjectResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.InjectResponse;

        /**
         * Creates a plain object from an InjectResponse message. Also converts values to other types if specified.
         * @param message InjectResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.InjectResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this InjectResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for InjectResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace InjectResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1
        }
    }

    /** Properties of a GetPropertyRequest. */
    interface IGetPropertyRequest {

        /** GetPropertyRequest windowId */
        windowId?: (string|null);

        /** GetPropertyRequest sessionId */
        sessionId?: (string|null);

        /** GetPropertyRequest name */
        name?: (string|null);
    }

    /** Represents a GetPropertyRequest. */
    class GetPropertyRequest implements IGetPropertyRequest {

        /**
         * Constructs a new GetPropertyRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetPropertyRequest);

        /** GetPropertyRequest windowId. */
        public windowId?: (string|null);

        /** GetPropertyRequest sessionId. */
        public sessionId?: (string|null);

        /** GetPropertyRequest name. */
        public name: string;

        /** GetPropertyRequest identifier. */
        public identifier?: ("windowId"|"sessionId");

        /**
         * Creates a new GetPropertyRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPropertyRequest instance
         */
        public static create(properties?: iterm2.IGetPropertyRequest): iterm2.GetPropertyRequest;

        /**
         * Encodes the specified GetPropertyRequest message. Does not implicitly {@link iterm2.GetPropertyRequest.verify|verify} messages.
         * @param message GetPropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetPropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPropertyRequest message, length delimited. Does not implicitly {@link iterm2.GetPropertyRequest.verify|verify} messages.
         * @param message GetPropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetPropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPropertyRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetPropertyRequest;

        /**
         * Decodes a GetPropertyRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetPropertyRequest;

        /**
         * Verifies a GetPropertyRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPropertyRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPropertyRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetPropertyRequest;

        /**
         * Creates a plain object from a GetPropertyRequest message. Also converts values to other types if specified.
         * @param message GetPropertyRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetPropertyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPropertyRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPropertyRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetPropertyResponse. */
    interface IGetPropertyResponse {

        /** GetPropertyResponse status */
        status?: (iterm2.GetPropertyResponse.Status|null);

        /** GetPropertyResponse jsonValue */
        jsonValue?: (string|null);
    }

    /** Represents a GetPropertyResponse. */
    class GetPropertyResponse implements IGetPropertyResponse {

        /**
         * Constructs a new GetPropertyResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetPropertyResponse);

        /** GetPropertyResponse status. */
        public status: iterm2.GetPropertyResponse.Status;

        /** GetPropertyResponse jsonValue. */
        public jsonValue: string;

        /**
         * Creates a new GetPropertyResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPropertyResponse instance
         */
        public static create(properties?: iterm2.IGetPropertyResponse): iterm2.GetPropertyResponse;

        /**
         * Encodes the specified GetPropertyResponse message. Does not implicitly {@link iterm2.GetPropertyResponse.verify|verify} messages.
         * @param message GetPropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetPropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPropertyResponse message, length delimited. Does not implicitly {@link iterm2.GetPropertyResponse.verify|verify} messages.
         * @param message GetPropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetPropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPropertyResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetPropertyResponse;

        /**
         * Decodes a GetPropertyResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetPropertyResponse;

        /**
         * Verifies a GetPropertyResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPropertyResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPropertyResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetPropertyResponse;

        /**
         * Creates a plain object from a GetPropertyResponse message. Also converts values to other types if specified.
         * @param message GetPropertyResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetPropertyResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPropertyResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPropertyResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace GetPropertyResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            UNRECOGNIZED_NAME = 1,
            INVALID_TARGET = 2
        }
    }

    /** Properties of a SetPropertyRequest. */
    interface ISetPropertyRequest {

        /** SetPropertyRequest windowId */
        windowId?: (string|null);

        /** SetPropertyRequest sessionId */
        sessionId?: (string|null);

        /** SetPropertyRequest name */
        name?: (string|null);

        /** SetPropertyRequest jsonValue */
        jsonValue?: (string|null);
    }

    /** Represents a SetPropertyRequest. */
    class SetPropertyRequest implements ISetPropertyRequest {

        /**
         * Constructs a new SetPropertyRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetPropertyRequest);

        /** SetPropertyRequest windowId. */
        public windowId?: (string|null);

        /** SetPropertyRequest sessionId. */
        public sessionId?: (string|null);

        /** SetPropertyRequest name. */
        public name: string;

        /** SetPropertyRequest jsonValue. */
        public jsonValue: string;

        /** SetPropertyRequest identifier. */
        public identifier?: ("windowId"|"sessionId");

        /**
         * Creates a new SetPropertyRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetPropertyRequest instance
         */
        public static create(properties?: iterm2.ISetPropertyRequest): iterm2.SetPropertyRequest;

        /**
         * Encodes the specified SetPropertyRequest message. Does not implicitly {@link iterm2.SetPropertyRequest.verify|verify} messages.
         * @param message SetPropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetPropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetPropertyRequest message, length delimited. Does not implicitly {@link iterm2.SetPropertyRequest.verify|verify} messages.
         * @param message SetPropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetPropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetPropertyRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetPropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetPropertyRequest;

        /**
         * Decodes a SetPropertyRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetPropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetPropertyRequest;

        /**
         * Verifies a SetPropertyRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetPropertyRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetPropertyRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetPropertyRequest;

        /**
         * Creates a plain object from a SetPropertyRequest message. Also converts values to other types if specified.
         * @param message SetPropertyRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetPropertyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetPropertyRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetPropertyRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SetPropertyResponse. */
    interface ISetPropertyResponse {

        /** SetPropertyResponse status */
        status?: (iterm2.SetPropertyResponse.Status|null);
    }

    /** Represents a SetPropertyResponse. */
    class SetPropertyResponse implements ISetPropertyResponse {

        /**
         * Constructs a new SetPropertyResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetPropertyResponse);

        /** SetPropertyResponse status. */
        public status: iterm2.SetPropertyResponse.Status;

        /**
         * Creates a new SetPropertyResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetPropertyResponse instance
         */
        public static create(properties?: iterm2.ISetPropertyResponse): iterm2.SetPropertyResponse;

        /**
         * Encodes the specified SetPropertyResponse message. Does not implicitly {@link iterm2.SetPropertyResponse.verify|verify} messages.
         * @param message SetPropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetPropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetPropertyResponse message, length delimited. Does not implicitly {@link iterm2.SetPropertyResponse.verify|verify} messages.
         * @param message SetPropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetPropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetPropertyResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetPropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetPropertyResponse;

        /**
         * Decodes a SetPropertyResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetPropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetPropertyResponse;

        /**
         * Verifies a SetPropertyResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetPropertyResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetPropertyResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetPropertyResponse;

        /**
         * Creates a plain object from a SetPropertyResponse message. Also converts values to other types if specified.
         * @param message SetPropertyResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetPropertyResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetPropertyResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetPropertyResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SetPropertyResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            UNRECOGNIZED_NAME = 1,
            INVALID_VALUE = 2,
            INVALID_TARGET = 3,
            DEFERRED = 4,
            IMPOSSIBLE = 5,
            FAILED = 6
        }
    }

    /** Properties of a RegisterToolRequest. */
    interface IRegisterToolRequest {

        /** RegisterToolRequest name */
        name?: (string|null);

        /** RegisterToolRequest identifier */
        identifier?: (string|null);

        /** RegisterToolRequest revealIfAlreadyRegistered */
        revealIfAlreadyRegistered?: (boolean|null);

        /** RegisterToolRequest toolType */
        toolType?: (iterm2.RegisterToolRequest.ToolType|null);

        /** RegisterToolRequest URL */
        URL?: (string|null);
    }

    /** Represents a RegisterToolRequest. */
    class RegisterToolRequest implements IRegisterToolRequest {

        /**
         * Constructs a new RegisterToolRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRegisterToolRequest);

        /** RegisterToolRequest name. */
        public name: string;

        /** RegisterToolRequest identifier. */
        public identifier: string;

        /** RegisterToolRequest revealIfAlreadyRegistered. */
        public revealIfAlreadyRegistered: boolean;

        /** RegisterToolRequest toolType. */
        public toolType: iterm2.RegisterToolRequest.ToolType;

        /** RegisterToolRequest URL. */
        public URL: string;

        /**
         * Creates a new RegisterToolRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RegisterToolRequest instance
         */
        public static create(properties?: iterm2.IRegisterToolRequest): iterm2.RegisterToolRequest;

        /**
         * Encodes the specified RegisterToolRequest message. Does not implicitly {@link iterm2.RegisterToolRequest.verify|verify} messages.
         * @param message RegisterToolRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRegisterToolRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RegisterToolRequest message, length delimited. Does not implicitly {@link iterm2.RegisterToolRequest.verify|verify} messages.
         * @param message RegisterToolRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRegisterToolRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RegisterToolRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RegisterToolRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RegisterToolRequest;

        /**
         * Decodes a RegisterToolRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RegisterToolRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RegisterToolRequest;

        /**
         * Verifies a RegisterToolRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RegisterToolRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RegisterToolRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RegisterToolRequest;

        /**
         * Creates a plain object from a RegisterToolRequest message. Also converts values to other types if specified.
         * @param message RegisterToolRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RegisterToolRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RegisterToolRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RegisterToolRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace RegisterToolRequest {

        /** ToolType enum. */
        enum ToolType {
            WEB_VIEW_TOOL = 1
        }
    }

    /** Properties of a RPCRegistrationRequest. */
    interface IRPCRegistrationRequest {

        /** RPCRegistrationRequest name */
        name?: (string|null);

        /** RPCRegistrationRequest arguments */
        "arguments"?: (iterm2.RPCRegistrationRequest.IRPCArgumentSignature[]|null);

        /** RPCRegistrationRequest defaults */
        defaults?: (iterm2.RPCRegistrationRequest.IRPCArgument[]|null);

        /** RPCRegistrationRequest timeout */
        timeout?: (number|null);

        /** RPCRegistrationRequest role */
        role?: (iterm2.RPCRegistrationRequest.Role|null);

        /** RPCRegistrationRequest sessionTitleAttributes */
        sessionTitleAttributes?: (iterm2.RPCRegistrationRequest.ISessionTitleAttributes|null);

        /** RPCRegistrationRequest statusBarComponentAttributes */
        statusBarComponentAttributes?: (iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes|null);

        /** RPCRegistrationRequest contextMenuAttributes */
        contextMenuAttributes?: (iterm2.RPCRegistrationRequest.IContextMenuAttributes|null);

        /** RPCRegistrationRequest displayName */
        displayName?: (string|null);
    }

    /** Represents a RPCRegistrationRequest. */
    class RPCRegistrationRequest implements IRPCRegistrationRequest {

        /**
         * Constructs a new RPCRegistrationRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRPCRegistrationRequest);

        /** RPCRegistrationRequest name. */
        public name: string;

        /** RPCRegistrationRequest arguments. */
        public arguments: iterm2.RPCRegistrationRequest.IRPCArgumentSignature[];

        /** RPCRegistrationRequest defaults. */
        public defaults: iterm2.RPCRegistrationRequest.IRPCArgument[];

        /** RPCRegistrationRequest timeout. */
        public timeout: number;

        /** RPCRegistrationRequest role. */
        public role: iterm2.RPCRegistrationRequest.Role;

        /** RPCRegistrationRequest sessionTitleAttributes. */
        public sessionTitleAttributes?: (iterm2.RPCRegistrationRequest.ISessionTitleAttributes|null);

        /** RPCRegistrationRequest statusBarComponentAttributes. */
        public statusBarComponentAttributes?: (iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes|null);

        /** RPCRegistrationRequest contextMenuAttributes. */
        public contextMenuAttributes?: (iterm2.RPCRegistrationRequest.IContextMenuAttributes|null);

        /** RPCRegistrationRequest displayName. */
        public displayName: string;

        /** RPCRegistrationRequest RoleSpecificAttributes. */
        public RoleSpecificAttributes?: ("sessionTitleAttributes"|"statusBarComponentAttributes"|"contextMenuAttributes");

        /**
         * Creates a new RPCRegistrationRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RPCRegistrationRequest instance
         */
        public static create(properties?: iterm2.IRPCRegistrationRequest): iterm2.RPCRegistrationRequest;

        /**
         * Encodes the specified RPCRegistrationRequest message. Does not implicitly {@link iterm2.RPCRegistrationRequest.verify|verify} messages.
         * @param message RPCRegistrationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRPCRegistrationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RPCRegistrationRequest message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.verify|verify} messages.
         * @param message RPCRegistrationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRPCRegistrationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RPCRegistrationRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RPCRegistrationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest;

        /**
         * Decodes a RPCRegistrationRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RPCRegistrationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest;

        /**
         * Verifies a RPCRegistrationRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RPCRegistrationRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RPCRegistrationRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest;

        /**
         * Creates a plain object from a RPCRegistrationRequest message. Also converts values to other types if specified.
         * @param message RPCRegistrationRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RPCRegistrationRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RPCRegistrationRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RPCRegistrationRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace RPCRegistrationRequest {

        /** Properties of a RPCArgumentSignature. */
        interface IRPCArgumentSignature {

            /** RPCArgumentSignature name */
            name?: (string|null);
        }

        /** Represents a RPCArgumentSignature. */
        class RPCArgumentSignature implements IRPCArgumentSignature {

            /**
             * Constructs a new RPCArgumentSignature.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.RPCRegistrationRequest.IRPCArgumentSignature);

            /** RPCArgumentSignature name. */
            public name: string;

            /**
             * Creates a new RPCArgumentSignature instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RPCArgumentSignature instance
             */
            public static create(properties?: iterm2.RPCRegistrationRequest.IRPCArgumentSignature): iterm2.RPCRegistrationRequest.RPCArgumentSignature;

            /**
             * Encodes the specified RPCArgumentSignature message. Does not implicitly {@link iterm2.RPCRegistrationRequest.RPCArgumentSignature.verify|verify} messages.
             * @param message RPCArgumentSignature message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.RPCRegistrationRequest.IRPCArgumentSignature, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RPCArgumentSignature message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.RPCArgumentSignature.verify|verify} messages.
             * @param message RPCArgumentSignature message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.RPCRegistrationRequest.IRPCArgumentSignature, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RPCArgumentSignature message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RPCArgumentSignature
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.RPCArgumentSignature;

            /**
             * Decodes a RPCArgumentSignature message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RPCArgumentSignature
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.RPCArgumentSignature;

            /**
             * Verifies a RPCArgumentSignature message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RPCArgumentSignature message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RPCArgumentSignature
             */
            public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.RPCArgumentSignature;

            /**
             * Creates a plain object from a RPCArgumentSignature message. Also converts values to other types if specified.
             * @param message RPCArgumentSignature
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.RPCRegistrationRequest.RPCArgumentSignature, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RPCArgumentSignature to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RPCArgumentSignature
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RPCArgument. */
        interface IRPCArgument {

            /** RPCArgument name */
            name?: (string|null);

            /** RPCArgument path */
            path?: (string|null);
        }

        /** Represents a RPCArgument. */
        class RPCArgument implements IRPCArgument {

            /**
             * Constructs a new RPCArgument.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.RPCRegistrationRequest.IRPCArgument);

            /** RPCArgument name. */
            public name: string;

            /** RPCArgument path. */
            public path: string;

            /**
             * Creates a new RPCArgument instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RPCArgument instance
             */
            public static create(properties?: iterm2.RPCRegistrationRequest.IRPCArgument): iterm2.RPCRegistrationRequest.RPCArgument;

            /**
             * Encodes the specified RPCArgument message. Does not implicitly {@link iterm2.RPCRegistrationRequest.RPCArgument.verify|verify} messages.
             * @param message RPCArgument message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.RPCRegistrationRequest.IRPCArgument, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RPCArgument message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.RPCArgument.verify|verify} messages.
             * @param message RPCArgument message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.RPCRegistrationRequest.IRPCArgument, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RPCArgument message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RPCArgument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.RPCArgument;

            /**
             * Decodes a RPCArgument message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RPCArgument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.RPCArgument;

            /**
             * Verifies a RPCArgument message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RPCArgument message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RPCArgument
             */
            public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.RPCArgument;

            /**
             * Creates a plain object from a RPCArgument message. Also converts values to other types if specified.
             * @param message RPCArgument
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.RPCRegistrationRequest.RPCArgument, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RPCArgument to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RPCArgument
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Role enum. */
        enum Role {
            GENERIC = 1,
            SESSION_TITLE = 2,
            STATUS_BAR_COMPONENT = 3,
            CONTEXT_MENU = 4
        }

        /** Properties of a SessionTitleAttributes. */
        interface ISessionTitleAttributes {

            /** SessionTitleAttributes displayName */
            displayName?: (string|null);

            /** SessionTitleAttributes uniqueIdentifier */
            uniqueIdentifier?: (string|null);
        }

        /** Represents a SessionTitleAttributes. */
        class SessionTitleAttributes implements ISessionTitleAttributes {

            /**
             * Constructs a new SessionTitleAttributes.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.RPCRegistrationRequest.ISessionTitleAttributes);

            /** SessionTitleAttributes displayName. */
            public displayName: string;

            /** SessionTitleAttributes uniqueIdentifier. */
            public uniqueIdentifier: string;

            /**
             * Creates a new SessionTitleAttributes instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SessionTitleAttributes instance
             */
            public static create(properties?: iterm2.RPCRegistrationRequest.ISessionTitleAttributes): iterm2.RPCRegistrationRequest.SessionTitleAttributes;

            /**
             * Encodes the specified SessionTitleAttributes message. Does not implicitly {@link iterm2.RPCRegistrationRequest.SessionTitleAttributes.verify|verify} messages.
             * @param message SessionTitleAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.RPCRegistrationRequest.ISessionTitleAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SessionTitleAttributes message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.SessionTitleAttributes.verify|verify} messages.
             * @param message SessionTitleAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.RPCRegistrationRequest.ISessionTitleAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SessionTitleAttributes message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SessionTitleAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.SessionTitleAttributes;

            /**
             * Decodes a SessionTitleAttributes message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SessionTitleAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.SessionTitleAttributes;

            /**
             * Verifies a SessionTitleAttributes message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SessionTitleAttributes message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SessionTitleAttributes
             */
            public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.SessionTitleAttributes;

            /**
             * Creates a plain object from a SessionTitleAttributes message. Also converts values to other types if specified.
             * @param message SessionTitleAttributes
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.RPCRegistrationRequest.SessionTitleAttributes, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SessionTitleAttributes to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SessionTitleAttributes
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a StatusBarComponentAttributes. */
        interface IStatusBarComponentAttributes {

            /** StatusBarComponentAttributes shortDescription */
            shortDescription?: (string|null);

            /** StatusBarComponentAttributes detailedDescription */
            detailedDescription?: (string|null);

            /** StatusBarComponentAttributes knobs */
            knobs?: (iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob[]|null);

            /** StatusBarComponentAttributes exemplar */
            exemplar?: (string|null);

            /** StatusBarComponentAttributes updateCadence */
            updateCadence?: (number|null);

            /** StatusBarComponentAttributes uniqueIdentifier */
            uniqueIdentifier?: (string|null);

            /** StatusBarComponentAttributes icons */
            icons?: (iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon[]|null);

            /** StatusBarComponentAttributes format */
            format?: (iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Format|null);
        }

        /** Represents a StatusBarComponentAttributes. */
        class StatusBarComponentAttributes implements IStatusBarComponentAttributes {

            /**
             * Constructs a new StatusBarComponentAttributes.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes);

            /** StatusBarComponentAttributes shortDescription. */
            public shortDescription: string;

            /** StatusBarComponentAttributes detailedDescription. */
            public detailedDescription: string;

            /** StatusBarComponentAttributes knobs. */
            public knobs: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob[];

            /** StatusBarComponentAttributes exemplar. */
            public exemplar: string;

            /** StatusBarComponentAttributes updateCadence. */
            public updateCadence: number;

            /** StatusBarComponentAttributes uniqueIdentifier. */
            public uniqueIdentifier: string;

            /** StatusBarComponentAttributes icons. */
            public icons: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon[];

            /** StatusBarComponentAttributes format. */
            public format: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Format;

            /**
             * Creates a new StatusBarComponentAttributes instance using the specified properties.
             * @param [properties] Properties to set
             * @returns StatusBarComponentAttributes instance
             */
            public static create(properties?: iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes;

            /**
             * Encodes the specified StatusBarComponentAttributes message. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.verify|verify} messages.
             * @param message StatusBarComponentAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified StatusBarComponentAttributes message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.verify|verify} messages.
             * @param message StatusBarComponentAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.RPCRegistrationRequest.IStatusBarComponentAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a StatusBarComponentAttributes message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns StatusBarComponentAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes;

            /**
             * Decodes a StatusBarComponentAttributes message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns StatusBarComponentAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes;

            /**
             * Verifies a StatusBarComponentAttributes message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a StatusBarComponentAttributes message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns StatusBarComponentAttributes
             */
            public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes;

            /**
             * Creates a plain object from a StatusBarComponentAttributes message. Also converts values to other types if specified.
             * @param message StatusBarComponentAttributes
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this StatusBarComponentAttributes to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for StatusBarComponentAttributes
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace StatusBarComponentAttributes {

            /** Properties of a Knob. */
            interface IKnob {

                /** Knob name */
                name?: (string|null);

                /** Knob type */
                type?: (iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob.Type|null);

                /** Knob placeholder */
                placeholder?: (string|null);

                /** Knob jsonDefaultValue */
                jsonDefaultValue?: (string|null);

                /** Knob key */
                key?: (string|null);
            }

            /** Represents a Knob. */
            class Knob implements IKnob {

                /**
                 * Constructs a new Knob.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob);

                /** Knob name. */
                public name: string;

                /** Knob type. */
                public type: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob.Type;

                /** Knob placeholder. */
                public placeholder: string;

                /** Knob jsonDefaultValue. */
                public jsonDefaultValue: string;

                /** Knob key. */
                public key: string;

                /**
                 * Creates a new Knob instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Knob instance
                 */
                public static create(properties?: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob;

                /**
                 * Encodes the specified Knob message. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob.verify|verify} messages.
                 * @param message Knob message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Knob message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob.verify|verify} messages.
                 * @param message Knob message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IKnob, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Knob message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Knob
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob;

                /**
                 * Decodes a Knob message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Knob
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob;

                /**
                 * Verifies a Knob message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Knob message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Knob
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob;

                /**
                 * Creates a plain object from a Knob message. Also converts values to other types if specified.
                 * @param message Knob
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Knob, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Knob to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Knob
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace Knob {

                /** Type enum. */
                enum Type {
                    Checkbox = 1,
                    String = 2,
                    PositiveFloatingPoint = 3,
                    Color = 4
                }
            }

            /** Properties of an Icon. */
            interface IIcon {

                /** Icon data */
                data?: (Uint8Array|null);

                /** Icon scale */
                scale?: (number|null);
            }

            /** Represents an Icon. */
            class Icon implements IIcon {

                /**
                 * Constructs a new Icon.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon);

                /** Icon data. */
                public data: Uint8Array;

                /** Icon scale. */
                public scale: number;

                /**
                 * Creates a new Icon instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Icon instance
                 */
                public static create(properties?: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon;

                /**
                 * Encodes the specified Icon message. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon.verify|verify} messages.
                 * @param message Icon message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Icon message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon.verify|verify} messages.
                 * @param message Icon message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.IIcon, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Icon message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Icon
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon;

                /**
                 * Decodes an Icon message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Icon
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon;

                /**
                 * Verifies an Icon message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an Icon message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Icon
                 */
                public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon;

                /**
                 * Creates a plain object from an Icon message. Also converts values to other types if specified.
                 * @param message Icon
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: iterm2.RPCRegistrationRequest.StatusBarComponentAttributes.Icon, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Icon to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Icon
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Format enum. */
            enum Format {
                PLAIN_TEXT = 0,
                HTML = 1
            }
        }

        /** Properties of a ContextMenuAttributes. */
        interface IContextMenuAttributes {

            /** ContextMenuAttributes displayName */
            displayName?: (string|null);

            /** ContextMenuAttributes uniqueIdentifier */
            uniqueIdentifier?: (string|null);
        }

        /** Represents a ContextMenuAttributes. */
        class ContextMenuAttributes implements IContextMenuAttributes {

            /**
             * Constructs a new ContextMenuAttributes.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.RPCRegistrationRequest.IContextMenuAttributes);

            /** ContextMenuAttributes displayName. */
            public displayName: string;

            /** ContextMenuAttributes uniqueIdentifier. */
            public uniqueIdentifier: string;

            /**
             * Creates a new ContextMenuAttributes instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ContextMenuAttributes instance
             */
            public static create(properties?: iterm2.RPCRegistrationRequest.IContextMenuAttributes): iterm2.RPCRegistrationRequest.ContextMenuAttributes;

            /**
             * Encodes the specified ContextMenuAttributes message. Does not implicitly {@link iterm2.RPCRegistrationRequest.ContextMenuAttributes.verify|verify} messages.
             * @param message ContextMenuAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.RPCRegistrationRequest.IContextMenuAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ContextMenuAttributes message, length delimited. Does not implicitly {@link iterm2.RPCRegistrationRequest.ContextMenuAttributes.verify|verify} messages.
             * @param message ContextMenuAttributes message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.RPCRegistrationRequest.IContextMenuAttributes, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ContextMenuAttributes message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ContextMenuAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RPCRegistrationRequest.ContextMenuAttributes;

            /**
             * Decodes a ContextMenuAttributes message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ContextMenuAttributes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RPCRegistrationRequest.ContextMenuAttributes;

            /**
             * Verifies a ContextMenuAttributes message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ContextMenuAttributes message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ContextMenuAttributes
             */
            public static fromObject(object: { [k: string]: any }): iterm2.RPCRegistrationRequest.ContextMenuAttributes;

            /**
             * Creates a plain object from a ContextMenuAttributes message. Also converts values to other types if specified.
             * @param message ContextMenuAttributes
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.RPCRegistrationRequest.ContextMenuAttributes, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ContextMenuAttributes to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ContextMenuAttributes
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a RegisterToolResponse. */
    interface IRegisterToolResponse {

        /** RegisterToolResponse status */
        status?: (iterm2.RegisterToolResponse.Status|null);
    }

    /** Represents a RegisterToolResponse. */
    class RegisterToolResponse implements IRegisterToolResponse {

        /**
         * Constructs a new RegisterToolResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRegisterToolResponse);

        /** RegisterToolResponse status. */
        public status: iterm2.RegisterToolResponse.Status;

        /**
         * Creates a new RegisterToolResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RegisterToolResponse instance
         */
        public static create(properties?: iterm2.IRegisterToolResponse): iterm2.RegisterToolResponse;

        /**
         * Encodes the specified RegisterToolResponse message. Does not implicitly {@link iterm2.RegisterToolResponse.verify|verify} messages.
         * @param message RegisterToolResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRegisterToolResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RegisterToolResponse message, length delimited. Does not implicitly {@link iterm2.RegisterToolResponse.verify|verify} messages.
         * @param message RegisterToolResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRegisterToolResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RegisterToolResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RegisterToolResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RegisterToolResponse;

        /**
         * Decodes a RegisterToolResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RegisterToolResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RegisterToolResponse;

        /**
         * Verifies a RegisterToolResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RegisterToolResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RegisterToolResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RegisterToolResponse;

        /**
         * Creates a plain object from a RegisterToolResponse message. Also converts values to other types if specified.
         * @param message RegisterToolResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RegisterToolResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RegisterToolResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RegisterToolResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace RegisterToolResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            REQUEST_MALFORMED = 1,
            PERMISSION_DENIED = 2
        }
    }

    /** NotificationType enum. */
    enum NotificationType {
        NOTIFY_ON_KEYSTROKE = 1,
        NOTIFY_ON_SCREEN_UPDATE = 2,
        NOTIFY_ON_PROMPT = 3,
        NOTIFY_ON_LOCATION_CHANGE = 4,
        NOTIFY_ON_CUSTOM_ESCAPE_SEQUENCE = 5,
        NOTIFY_ON_VARIABLE_CHANGE = 12,
        KEYSTROKE_FILTER = 14,
        NOTIFY_ON_NEW_SESSION = 6,
        NOTIFY_ON_TERMINATE_SESSION = 7,
        NOTIFY_ON_LAYOUT_CHANGE = 8,
        NOTIFY_ON_FOCUS_CHANGE = 9,
        NOTIFY_ON_SERVER_ORIGINATED_RPC = 10,
        NOTIFY_ON_BROADCAST_CHANGE = 11,
        NOTIFY_ON_PROFILE_CHANGE = 13
    }

    /** Modifiers enum. */
    enum Modifiers {
        CONTROL = 1,
        OPTION = 2,
        COMMAND = 3,
        SHIFT = 4,
        FUNCTION = 5,
        NUMPAD = 6
    }

    /** Properties of a KeystrokePattern. */
    interface IKeystrokePattern {

        /** KeystrokePattern requiredModifiers */
        requiredModifiers?: (iterm2.Modifiers[]|null);

        /** KeystrokePattern forbiddenModifiers */
        forbiddenModifiers?: (iterm2.Modifiers[]|null);

        /** KeystrokePattern keycodes */
        keycodes?: (number[]|null);

        /** KeystrokePattern characters */
        characters?: (string[]|null);

        /** KeystrokePattern charactersIgnoringModifiers */
        charactersIgnoringModifiers?: (string[]|null);
    }

    /** Represents a KeystrokePattern. */
    class KeystrokePattern implements IKeystrokePattern {

        /**
         * Constructs a new KeystrokePattern.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IKeystrokePattern);

        /** KeystrokePattern requiredModifiers. */
        public requiredModifiers: iterm2.Modifiers[];

        /** KeystrokePattern forbiddenModifiers. */
        public forbiddenModifiers: iterm2.Modifiers[];

        /** KeystrokePattern keycodes. */
        public keycodes: number[];

        /** KeystrokePattern characters. */
        public characters: string[];

        /** KeystrokePattern charactersIgnoringModifiers. */
        public charactersIgnoringModifiers: string[];

        /**
         * Creates a new KeystrokePattern instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KeystrokePattern instance
         */
        public static create(properties?: iterm2.IKeystrokePattern): iterm2.KeystrokePattern;

        /**
         * Encodes the specified KeystrokePattern message. Does not implicitly {@link iterm2.KeystrokePattern.verify|verify} messages.
         * @param message KeystrokePattern message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IKeystrokePattern, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KeystrokePattern message, length delimited. Does not implicitly {@link iterm2.KeystrokePattern.verify|verify} messages.
         * @param message KeystrokePattern message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IKeystrokePattern, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KeystrokePattern message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KeystrokePattern
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.KeystrokePattern;

        /**
         * Decodes a KeystrokePattern message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KeystrokePattern
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.KeystrokePattern;

        /**
         * Verifies a KeystrokePattern message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KeystrokePattern message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KeystrokePattern
         */
        public static fromObject(object: { [k: string]: any }): iterm2.KeystrokePattern;

        /**
         * Creates a plain object from a KeystrokePattern message. Also converts values to other types if specified.
         * @param message KeystrokePattern
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.KeystrokePattern, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KeystrokePattern to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KeystrokePattern
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a KeystrokeMonitorRequest. */
    interface IKeystrokeMonitorRequest {

        /** KeystrokeMonitorRequest patternsToIgnore */
        patternsToIgnore?: (iterm2.IKeystrokePattern[]|null);

        /** KeystrokeMonitorRequest advanced */
        advanced?: (boolean|null);
    }

    /** Represents a KeystrokeMonitorRequest. */
    class KeystrokeMonitorRequest implements IKeystrokeMonitorRequest {

        /**
         * Constructs a new KeystrokeMonitorRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IKeystrokeMonitorRequest);

        /** KeystrokeMonitorRequest patternsToIgnore. */
        public patternsToIgnore: iterm2.IKeystrokePattern[];

        /** KeystrokeMonitorRequest advanced. */
        public advanced: boolean;

        /**
         * Creates a new KeystrokeMonitorRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KeystrokeMonitorRequest instance
         */
        public static create(properties?: iterm2.IKeystrokeMonitorRequest): iterm2.KeystrokeMonitorRequest;

        /**
         * Encodes the specified KeystrokeMonitorRequest message. Does not implicitly {@link iterm2.KeystrokeMonitorRequest.verify|verify} messages.
         * @param message KeystrokeMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IKeystrokeMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KeystrokeMonitorRequest message, length delimited. Does not implicitly {@link iterm2.KeystrokeMonitorRequest.verify|verify} messages.
         * @param message KeystrokeMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IKeystrokeMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KeystrokeMonitorRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KeystrokeMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.KeystrokeMonitorRequest;

        /**
         * Decodes a KeystrokeMonitorRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KeystrokeMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.KeystrokeMonitorRequest;

        /**
         * Verifies a KeystrokeMonitorRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KeystrokeMonitorRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KeystrokeMonitorRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.KeystrokeMonitorRequest;

        /**
         * Creates a plain object from a KeystrokeMonitorRequest message. Also converts values to other types if specified.
         * @param message KeystrokeMonitorRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.KeystrokeMonitorRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KeystrokeMonitorRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KeystrokeMonitorRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a KeystrokeFilterRequest. */
    interface IKeystrokeFilterRequest {

        /** KeystrokeFilterRequest patternsToIgnore */
        patternsToIgnore?: (iterm2.IKeystrokePattern[]|null);
    }

    /** Represents a KeystrokeFilterRequest. */
    class KeystrokeFilterRequest implements IKeystrokeFilterRequest {

        /**
         * Constructs a new KeystrokeFilterRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IKeystrokeFilterRequest);

        /** KeystrokeFilterRequest patternsToIgnore. */
        public patternsToIgnore: iterm2.IKeystrokePattern[];

        /**
         * Creates a new KeystrokeFilterRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KeystrokeFilterRequest instance
         */
        public static create(properties?: iterm2.IKeystrokeFilterRequest): iterm2.KeystrokeFilterRequest;

        /**
         * Encodes the specified KeystrokeFilterRequest message. Does not implicitly {@link iterm2.KeystrokeFilterRequest.verify|verify} messages.
         * @param message KeystrokeFilterRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IKeystrokeFilterRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KeystrokeFilterRequest message, length delimited. Does not implicitly {@link iterm2.KeystrokeFilterRequest.verify|verify} messages.
         * @param message KeystrokeFilterRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IKeystrokeFilterRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KeystrokeFilterRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KeystrokeFilterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.KeystrokeFilterRequest;

        /**
         * Decodes a KeystrokeFilterRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KeystrokeFilterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.KeystrokeFilterRequest;

        /**
         * Verifies a KeystrokeFilterRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KeystrokeFilterRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KeystrokeFilterRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.KeystrokeFilterRequest;

        /**
         * Creates a plain object from a KeystrokeFilterRequest message. Also converts values to other types if specified.
         * @param message KeystrokeFilterRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.KeystrokeFilterRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KeystrokeFilterRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KeystrokeFilterRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** VariableScope enum. */
    enum VariableScope {
        SESSION = 1,
        TAB = 2,
        WINDOW = 3,
        APP = 4
    }

    /** Properties of a VariableMonitorRequest. */
    interface IVariableMonitorRequest {

        /** VariableMonitorRequest name */
        name?: (string|null);

        /** VariableMonitorRequest scope */
        scope?: (iterm2.VariableScope|null);

        /** VariableMonitorRequest identifier */
        identifier?: (string|null);
    }

    /** Represents a VariableMonitorRequest. */
    class VariableMonitorRequest implements IVariableMonitorRequest {

        /**
         * Constructs a new VariableMonitorRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IVariableMonitorRequest);

        /** VariableMonitorRequest name. */
        public name: string;

        /** VariableMonitorRequest scope. */
        public scope: iterm2.VariableScope;

        /** VariableMonitorRequest identifier. */
        public identifier: string;

        /**
         * Creates a new VariableMonitorRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VariableMonitorRequest instance
         */
        public static create(properties?: iterm2.IVariableMonitorRequest): iterm2.VariableMonitorRequest;

        /**
         * Encodes the specified VariableMonitorRequest message. Does not implicitly {@link iterm2.VariableMonitorRequest.verify|verify} messages.
         * @param message VariableMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IVariableMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified VariableMonitorRequest message, length delimited. Does not implicitly {@link iterm2.VariableMonitorRequest.verify|verify} messages.
         * @param message VariableMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IVariableMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VariableMonitorRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VariableMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.VariableMonitorRequest;

        /**
         * Decodes a VariableMonitorRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns VariableMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.VariableMonitorRequest;

        /**
         * Verifies a VariableMonitorRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a VariableMonitorRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns VariableMonitorRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.VariableMonitorRequest;

        /**
         * Creates a plain object from a VariableMonitorRequest message. Also converts values to other types if specified.
         * @param message VariableMonitorRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.VariableMonitorRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this VariableMonitorRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for VariableMonitorRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ProfileChangeRequest. */
    interface IProfileChangeRequest {

        /** ProfileChangeRequest guid */
        guid?: (string|null);
    }

    /** Represents a ProfileChangeRequest. */
    class ProfileChangeRequest implements IProfileChangeRequest {

        /**
         * Constructs a new ProfileChangeRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IProfileChangeRequest);

        /** ProfileChangeRequest guid. */
        public guid: string;

        /**
         * Creates a new ProfileChangeRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProfileChangeRequest instance
         */
        public static create(properties?: iterm2.IProfileChangeRequest): iterm2.ProfileChangeRequest;

        /**
         * Encodes the specified ProfileChangeRequest message. Does not implicitly {@link iterm2.ProfileChangeRequest.verify|verify} messages.
         * @param message ProfileChangeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IProfileChangeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProfileChangeRequest message, length delimited. Does not implicitly {@link iterm2.ProfileChangeRequest.verify|verify} messages.
         * @param message ProfileChangeRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IProfileChangeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProfileChangeRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProfileChangeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ProfileChangeRequest;

        /**
         * Decodes a ProfileChangeRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProfileChangeRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ProfileChangeRequest;

        /**
         * Verifies a ProfileChangeRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProfileChangeRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProfileChangeRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ProfileChangeRequest;

        /**
         * Creates a plain object from a ProfileChangeRequest message. Also converts values to other types if specified.
         * @param message ProfileChangeRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ProfileChangeRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProfileChangeRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProfileChangeRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** PromptMonitorMode enum. */
    enum PromptMonitorMode {
        PROMPT = 1,
        COMMAND_START = 2,
        COMMAND_END = 3
    }

    /** Properties of a PromptMonitorRequest. */
    interface IPromptMonitorRequest {

        /** PromptMonitorRequest modes */
        modes?: (iterm2.PromptMonitorMode[]|null);
    }

    /** Represents a PromptMonitorRequest. */
    class PromptMonitorRequest implements IPromptMonitorRequest {

        /**
         * Constructs a new PromptMonitorRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPromptMonitorRequest);

        /** PromptMonitorRequest modes. */
        public modes: iterm2.PromptMonitorMode[];

        /**
         * Creates a new PromptMonitorRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PromptMonitorRequest instance
         */
        public static create(properties?: iterm2.IPromptMonitorRequest): iterm2.PromptMonitorRequest;

        /**
         * Encodes the specified PromptMonitorRequest message. Does not implicitly {@link iterm2.PromptMonitorRequest.verify|verify} messages.
         * @param message PromptMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPromptMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PromptMonitorRequest message, length delimited. Does not implicitly {@link iterm2.PromptMonitorRequest.verify|verify} messages.
         * @param message PromptMonitorRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPromptMonitorRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PromptMonitorRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PromptMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PromptMonitorRequest;

        /**
         * Decodes a PromptMonitorRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PromptMonitorRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PromptMonitorRequest;

        /**
         * Verifies a PromptMonitorRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PromptMonitorRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PromptMonitorRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PromptMonitorRequest;

        /**
         * Creates a plain object from a PromptMonitorRequest message. Also converts values to other types if specified.
         * @param message PromptMonitorRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PromptMonitorRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PromptMonitorRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PromptMonitorRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a NotificationRequest. */
    interface INotificationRequest {

        /** NotificationRequest session */
        session?: (string|null);

        /** NotificationRequest subscribe */
        subscribe?: (boolean|null);

        /** NotificationRequest notificationType */
        notificationType?: (iterm2.NotificationType|null);

        /** NotificationRequest rpcRegistrationRequest */
        rpcRegistrationRequest?: (iterm2.IRPCRegistrationRequest|null);

        /** NotificationRequest keystrokeMonitorRequest */
        keystrokeMonitorRequest?: (iterm2.IKeystrokeMonitorRequest|null);

        /** NotificationRequest variableMonitorRequest */
        variableMonitorRequest?: (iterm2.IVariableMonitorRequest|null);

        /** NotificationRequest profileChangeRequest */
        profileChangeRequest?: (iterm2.IProfileChangeRequest|null);

        /** NotificationRequest keystrokeFilterRequest */
        keystrokeFilterRequest?: (iterm2.IKeystrokeFilterRequest|null);

        /** NotificationRequest promptMonitorRequest */
        promptMonitorRequest?: (iterm2.IPromptMonitorRequest|null);
    }

    /** Represents a NotificationRequest. */
    class NotificationRequest implements INotificationRequest {

        /**
         * Constructs a new NotificationRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.INotificationRequest);

        /** NotificationRequest session. */
        public session: string;

        /** NotificationRequest subscribe. */
        public subscribe: boolean;

        /** NotificationRequest notificationType. */
        public notificationType: iterm2.NotificationType;

        /** NotificationRequest rpcRegistrationRequest. */
        public rpcRegistrationRequest?: (iterm2.IRPCRegistrationRequest|null);

        /** NotificationRequest keystrokeMonitorRequest. */
        public keystrokeMonitorRequest?: (iterm2.IKeystrokeMonitorRequest|null);

        /** NotificationRequest variableMonitorRequest. */
        public variableMonitorRequest?: (iterm2.IVariableMonitorRequest|null);

        /** NotificationRequest profileChangeRequest. */
        public profileChangeRequest?: (iterm2.IProfileChangeRequest|null);

        /** NotificationRequest keystrokeFilterRequest. */
        public keystrokeFilterRequest?: (iterm2.IKeystrokeFilterRequest|null);

        /** NotificationRequest promptMonitorRequest. */
        public promptMonitorRequest?: (iterm2.IPromptMonitorRequest|null);

        /** NotificationRequest arguments. */
        public arguments_?: ("rpcRegistrationRequest"|"keystrokeMonitorRequest"|"variableMonitorRequest"|"profileChangeRequest"|"keystrokeFilterRequest"|"promptMonitorRequest");

        /**
         * Creates a new NotificationRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NotificationRequest instance
         */
        public static create(properties?: iterm2.INotificationRequest): iterm2.NotificationRequest;

        /**
         * Encodes the specified NotificationRequest message. Does not implicitly {@link iterm2.NotificationRequest.verify|verify} messages.
         * @param message NotificationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.INotificationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified NotificationRequest message, length delimited. Does not implicitly {@link iterm2.NotificationRequest.verify|verify} messages.
         * @param message NotificationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.INotificationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NotificationRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NotificationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.NotificationRequest;

        /**
         * Decodes a NotificationRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns NotificationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.NotificationRequest;

        /**
         * Verifies a NotificationRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a NotificationRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns NotificationRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.NotificationRequest;

        /**
         * Creates a plain object from a NotificationRequest message. Also converts values to other types if specified.
         * @param message NotificationRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.NotificationRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this NotificationRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for NotificationRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a NotificationResponse. */
    interface INotificationResponse {

        /** NotificationResponse status */
        status?: (iterm2.NotificationResponse.Status|null);
    }

    /** Represents a NotificationResponse. */
    class NotificationResponse implements INotificationResponse {

        /**
         * Constructs a new NotificationResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.INotificationResponse);

        /** NotificationResponse status. */
        public status: iterm2.NotificationResponse.Status;

        /**
         * Creates a new NotificationResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NotificationResponse instance
         */
        public static create(properties?: iterm2.INotificationResponse): iterm2.NotificationResponse;

        /**
         * Encodes the specified NotificationResponse message. Does not implicitly {@link iterm2.NotificationResponse.verify|verify} messages.
         * @param message NotificationResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.INotificationResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified NotificationResponse message, length delimited. Does not implicitly {@link iterm2.NotificationResponse.verify|verify} messages.
         * @param message NotificationResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.INotificationResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NotificationResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NotificationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.NotificationResponse;

        /**
         * Decodes a NotificationResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns NotificationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.NotificationResponse;

        /**
         * Verifies a NotificationResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a NotificationResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns NotificationResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.NotificationResponse;

        /**
         * Creates a plain object from a NotificationResponse message. Also converts values to other types if specified.
         * @param message NotificationResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.NotificationResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this NotificationResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for NotificationResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace NotificationResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2,
            NOT_SUBSCRIBED = 3,
            ALREADY_SUBSCRIBED = 4,
            DUPLICATE_SERVER_ORIGINATED_RPC = 5,
            INVALID_IDENTIFIER = 6
        }
    }

    /** Properties of a Notification. */
    interface INotification {

        /** Notification keystrokeNotification */
        keystrokeNotification?: (iterm2.IKeystrokeNotification|null);

        /** Notification screenUpdateNotification */
        screenUpdateNotification?: (iterm2.IScreenUpdateNotification|null);

        /** Notification promptNotification */
        promptNotification?: (iterm2.IPromptNotification|null);

        /** Notification locationChangeNotification */
        locationChangeNotification?: (iterm2.ILocationChangeNotification|null);

        /** Notification customEscapeSequenceNotification */
        customEscapeSequenceNotification?: (iterm2.ICustomEscapeSequenceNotification|null);

        /** Notification newSessionNotification */
        newSessionNotification?: (iterm2.INewSessionNotification|null);

        /** Notification terminateSessionNotification */
        terminateSessionNotification?: (iterm2.ITerminateSessionNotification|null);

        /** Notification layoutChangedNotification */
        layoutChangedNotification?: (iterm2.ILayoutChangedNotification|null);

        /** Notification focusChangedNotification */
        focusChangedNotification?: (iterm2.IFocusChangedNotification|null);

        /** Notification serverOriginatedRpcNotification */
        serverOriginatedRpcNotification?: (iterm2.IServerOriginatedRPCNotification|null);

        /** Notification broadcastDomainsChanged */
        broadcastDomainsChanged?: (iterm2.IBroadcastDomainsChangedNotification|null);

        /** Notification variableChangedNotification */
        variableChangedNotification?: (iterm2.IVariableChangedNotification|null);

        /** Notification profileChangedNotification */
        profileChangedNotification?: (iterm2.IProfileChangedNotification|null);
    }

    /** Represents a Notification. */
    class Notification implements INotification {

        /**
         * Constructs a new Notification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.INotification);

        /** Notification keystrokeNotification. */
        public keystrokeNotification?: (iterm2.IKeystrokeNotification|null);

        /** Notification screenUpdateNotification. */
        public screenUpdateNotification?: (iterm2.IScreenUpdateNotification|null);

        /** Notification promptNotification. */
        public promptNotification?: (iterm2.IPromptNotification|null);

        /** Notification locationChangeNotification. */
        public locationChangeNotification?: (iterm2.ILocationChangeNotification|null);

        /** Notification customEscapeSequenceNotification. */
        public customEscapeSequenceNotification?: (iterm2.ICustomEscapeSequenceNotification|null);

        /** Notification newSessionNotification. */
        public newSessionNotification?: (iterm2.INewSessionNotification|null);

        /** Notification terminateSessionNotification. */
        public terminateSessionNotification?: (iterm2.ITerminateSessionNotification|null);

        /** Notification layoutChangedNotification. */
        public layoutChangedNotification?: (iterm2.ILayoutChangedNotification|null);

        /** Notification focusChangedNotification. */
        public focusChangedNotification?: (iterm2.IFocusChangedNotification|null);

        /** Notification serverOriginatedRpcNotification. */
        public serverOriginatedRpcNotification?: (iterm2.IServerOriginatedRPCNotification|null);

        /** Notification broadcastDomainsChanged. */
        public broadcastDomainsChanged?: (iterm2.IBroadcastDomainsChangedNotification|null);

        /** Notification variableChangedNotification. */
        public variableChangedNotification?: (iterm2.IVariableChangedNotification|null);

        /** Notification profileChangedNotification. */
        public profileChangedNotification?: (iterm2.IProfileChangedNotification|null);

        /**
         * Creates a new Notification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Notification instance
         */
        public static create(properties?: iterm2.INotification): iterm2.Notification;

        /**
         * Encodes the specified Notification message. Does not implicitly {@link iterm2.Notification.verify|verify} messages.
         * @param message Notification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.INotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Notification message, length delimited. Does not implicitly {@link iterm2.Notification.verify|verify} messages.
         * @param message Notification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.INotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Notification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Notification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Notification;

        /**
         * Decodes a Notification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Notification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Notification;

        /**
         * Verifies a Notification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Notification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Notification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Notification;

        /**
         * Creates a plain object from a Notification message. Also converts values to other types if specified.
         * @param message Notification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Notification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Notification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Notification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ProfileChangedNotification. */
    interface IProfileChangedNotification {

        /** ProfileChangedNotification guid */
        guid?: (string|null);
    }

    /** Represents a ProfileChangedNotification. */
    class ProfileChangedNotification implements IProfileChangedNotification {

        /**
         * Constructs a new ProfileChangedNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IProfileChangedNotification);

        /** ProfileChangedNotification guid. */
        public guid: string;

        /**
         * Creates a new ProfileChangedNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProfileChangedNotification instance
         */
        public static create(properties?: iterm2.IProfileChangedNotification): iterm2.ProfileChangedNotification;

        /**
         * Encodes the specified ProfileChangedNotification message. Does not implicitly {@link iterm2.ProfileChangedNotification.verify|verify} messages.
         * @param message ProfileChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IProfileChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProfileChangedNotification message, length delimited. Does not implicitly {@link iterm2.ProfileChangedNotification.verify|verify} messages.
         * @param message ProfileChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IProfileChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProfileChangedNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProfileChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ProfileChangedNotification;

        /**
         * Decodes a ProfileChangedNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProfileChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ProfileChangedNotification;

        /**
         * Verifies a ProfileChangedNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProfileChangedNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProfileChangedNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ProfileChangedNotification;

        /**
         * Creates a plain object from a ProfileChangedNotification message. Also converts values to other types if specified.
         * @param message ProfileChangedNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ProfileChangedNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProfileChangedNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProfileChangedNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a VariableChangedNotification. */
    interface IVariableChangedNotification {

        /** VariableChangedNotification scope */
        scope?: (iterm2.VariableScope|null);

        /** VariableChangedNotification identifier */
        identifier?: (string|null);

        /** VariableChangedNotification name */
        name?: (string|null);

        /** VariableChangedNotification jsonNewValue */
        jsonNewValue?: (string|null);
    }

    /** Represents a VariableChangedNotification. */
    class VariableChangedNotification implements IVariableChangedNotification {

        /**
         * Constructs a new VariableChangedNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IVariableChangedNotification);

        /** VariableChangedNotification scope. */
        public scope: iterm2.VariableScope;

        /** VariableChangedNotification identifier. */
        public identifier: string;

        /** VariableChangedNotification name. */
        public name: string;

        /** VariableChangedNotification jsonNewValue. */
        public jsonNewValue: string;

        /**
         * Creates a new VariableChangedNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VariableChangedNotification instance
         */
        public static create(properties?: iterm2.IVariableChangedNotification): iterm2.VariableChangedNotification;

        /**
         * Encodes the specified VariableChangedNotification message. Does not implicitly {@link iterm2.VariableChangedNotification.verify|verify} messages.
         * @param message VariableChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IVariableChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified VariableChangedNotification message, length delimited. Does not implicitly {@link iterm2.VariableChangedNotification.verify|verify} messages.
         * @param message VariableChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IVariableChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VariableChangedNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VariableChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.VariableChangedNotification;

        /**
         * Decodes a VariableChangedNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns VariableChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.VariableChangedNotification;

        /**
         * Verifies a VariableChangedNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a VariableChangedNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns VariableChangedNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.VariableChangedNotification;

        /**
         * Creates a plain object from a VariableChangedNotification message. Also converts values to other types if specified.
         * @param message VariableChangedNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.VariableChangedNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this VariableChangedNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for VariableChangedNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BroadcastDomainsChangedNotification. */
    interface IBroadcastDomainsChangedNotification {

        /** BroadcastDomainsChangedNotification broadcastDomains */
        broadcastDomains?: (iterm2.IBroadcastDomain[]|null);
    }

    /** Represents a BroadcastDomainsChangedNotification. */
    class BroadcastDomainsChangedNotification implements IBroadcastDomainsChangedNotification {

        /**
         * Constructs a new BroadcastDomainsChangedNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IBroadcastDomainsChangedNotification);

        /** BroadcastDomainsChangedNotification broadcastDomains. */
        public broadcastDomains: iterm2.IBroadcastDomain[];

        /**
         * Creates a new BroadcastDomainsChangedNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BroadcastDomainsChangedNotification instance
         */
        public static create(properties?: iterm2.IBroadcastDomainsChangedNotification): iterm2.BroadcastDomainsChangedNotification;

        /**
         * Encodes the specified BroadcastDomainsChangedNotification message. Does not implicitly {@link iterm2.BroadcastDomainsChangedNotification.verify|verify} messages.
         * @param message BroadcastDomainsChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IBroadcastDomainsChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BroadcastDomainsChangedNotification message, length delimited. Does not implicitly {@link iterm2.BroadcastDomainsChangedNotification.verify|verify} messages.
         * @param message BroadcastDomainsChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IBroadcastDomainsChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BroadcastDomainsChangedNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BroadcastDomainsChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.BroadcastDomainsChangedNotification;

        /**
         * Decodes a BroadcastDomainsChangedNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BroadcastDomainsChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.BroadcastDomainsChangedNotification;

        /**
         * Verifies a BroadcastDomainsChangedNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BroadcastDomainsChangedNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BroadcastDomainsChangedNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.BroadcastDomainsChangedNotification;

        /**
         * Creates a plain object from a BroadcastDomainsChangedNotification message. Also converts values to other types if specified.
         * @param message BroadcastDomainsChangedNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.BroadcastDomainsChangedNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BroadcastDomainsChangedNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BroadcastDomainsChangedNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ServerOriginatedRPC. */
    interface IServerOriginatedRPC {

        /** ServerOriginatedRPC name */
        name?: (string|null);

        /** ServerOriginatedRPC arguments */
        "arguments"?: (iterm2.ServerOriginatedRPC.IRPCArgument[]|null);
    }

    /** Represents a ServerOriginatedRPC. */
    class ServerOriginatedRPC implements IServerOriginatedRPC {

        /**
         * Constructs a new ServerOriginatedRPC.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IServerOriginatedRPC);

        /** ServerOriginatedRPC name. */
        public name: string;

        /** ServerOriginatedRPC arguments. */
        public arguments: iterm2.ServerOriginatedRPC.IRPCArgument[];

        /**
         * Creates a new ServerOriginatedRPC instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerOriginatedRPC instance
         */
        public static create(properties?: iterm2.IServerOriginatedRPC): iterm2.ServerOriginatedRPC;

        /**
         * Encodes the specified ServerOriginatedRPC message. Does not implicitly {@link iterm2.ServerOriginatedRPC.verify|verify} messages.
         * @param message ServerOriginatedRPC message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IServerOriginatedRPC, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerOriginatedRPC message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedRPC.verify|verify} messages.
         * @param message ServerOriginatedRPC message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IServerOriginatedRPC, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerOriginatedRPC message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerOriginatedRPC
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedRPC;

        /**
         * Decodes a ServerOriginatedRPC message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerOriginatedRPC
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedRPC;

        /**
         * Verifies a ServerOriginatedRPC message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerOriginatedRPC message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerOriginatedRPC
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedRPC;

        /**
         * Creates a plain object from a ServerOriginatedRPC message. Also converts values to other types if specified.
         * @param message ServerOriginatedRPC
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ServerOriginatedRPC, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerOriginatedRPC to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ServerOriginatedRPC
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ServerOriginatedRPC {

        /** Properties of a RPCArgument. */
        interface IRPCArgument {

            /** RPCArgument name */
            name?: (string|null);

            /** RPCArgument jsonValue */
            jsonValue?: (string|null);
        }

        /** Represents a RPCArgument. */
        class RPCArgument implements IRPCArgument {

            /**
             * Constructs a new RPCArgument.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ServerOriginatedRPC.IRPCArgument);

            /** RPCArgument name. */
            public name: string;

            /** RPCArgument jsonValue. */
            public jsonValue: string;

            /**
             * Creates a new RPCArgument instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RPCArgument instance
             */
            public static create(properties?: iterm2.ServerOriginatedRPC.IRPCArgument): iterm2.ServerOriginatedRPC.RPCArgument;

            /**
             * Encodes the specified RPCArgument message. Does not implicitly {@link iterm2.ServerOriginatedRPC.RPCArgument.verify|verify} messages.
             * @param message RPCArgument message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ServerOriginatedRPC.IRPCArgument, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RPCArgument message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedRPC.RPCArgument.verify|verify} messages.
             * @param message RPCArgument message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ServerOriginatedRPC.IRPCArgument, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RPCArgument message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RPCArgument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedRPC.RPCArgument;

            /**
             * Decodes a RPCArgument message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RPCArgument
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedRPC.RPCArgument;

            /**
             * Verifies a RPCArgument message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RPCArgument message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RPCArgument
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedRPC.RPCArgument;

            /**
             * Creates a plain object from a RPCArgument message. Also converts values to other types if specified.
             * @param message RPCArgument
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ServerOriginatedRPC.RPCArgument, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RPCArgument to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RPCArgument
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a ServerOriginatedRPCNotification. */
    interface IServerOriginatedRPCNotification {

        /** ServerOriginatedRPCNotification requestId */
        requestId?: (string|null);

        /** ServerOriginatedRPCNotification rpc */
        rpc?: (iterm2.IServerOriginatedRPC|null);
    }

    /** Represents a ServerOriginatedRPCNotification. */
    class ServerOriginatedRPCNotification implements IServerOriginatedRPCNotification {

        /**
         * Constructs a new ServerOriginatedRPCNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IServerOriginatedRPCNotification);

        /** ServerOriginatedRPCNotification requestId. */
        public requestId: string;

        /** ServerOriginatedRPCNotification rpc. */
        public rpc?: (iterm2.IServerOriginatedRPC|null);

        /**
         * Creates a new ServerOriginatedRPCNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerOriginatedRPCNotification instance
         */
        public static create(properties?: iterm2.IServerOriginatedRPCNotification): iterm2.ServerOriginatedRPCNotification;

        /**
         * Encodes the specified ServerOriginatedRPCNotification message. Does not implicitly {@link iterm2.ServerOriginatedRPCNotification.verify|verify} messages.
         * @param message ServerOriginatedRPCNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IServerOriginatedRPCNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerOriginatedRPCNotification message, length delimited. Does not implicitly {@link iterm2.ServerOriginatedRPCNotification.verify|verify} messages.
         * @param message ServerOriginatedRPCNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IServerOriginatedRPCNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerOriginatedRPCNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerOriginatedRPCNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ServerOriginatedRPCNotification;

        /**
         * Decodes a ServerOriginatedRPCNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerOriginatedRPCNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ServerOriginatedRPCNotification;

        /**
         * Verifies a ServerOriginatedRPCNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerOriginatedRPCNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerOriginatedRPCNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ServerOriginatedRPCNotification;

        /**
         * Creates a plain object from a ServerOriginatedRPCNotification message. Also converts values to other types if specified.
         * @param message ServerOriginatedRPCNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ServerOriginatedRPCNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerOriginatedRPCNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ServerOriginatedRPCNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a KeystrokeNotification. */
    interface IKeystrokeNotification {

        /** KeystrokeNotification characters */
        characters?: (string|null);

        /** KeystrokeNotification charactersIgnoringModifiers */
        charactersIgnoringModifiers?: (string|null);

        /** KeystrokeNotification modifiers */
        modifiers?: (iterm2.Modifiers[]|null);

        /** KeystrokeNotification keyCode */
        keyCode?: (number|null);

        /** KeystrokeNotification session */
        session?: (string|null);

        /** KeystrokeNotification action */
        action?: (iterm2.KeystrokeNotification.Action|null);
    }

    /** Represents a KeystrokeNotification. */
    class KeystrokeNotification implements IKeystrokeNotification {

        /**
         * Constructs a new KeystrokeNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IKeystrokeNotification);

        /** KeystrokeNotification characters. */
        public characters: string;

        /** KeystrokeNotification charactersIgnoringModifiers. */
        public charactersIgnoringModifiers: string;

        /** KeystrokeNotification modifiers. */
        public modifiers: iterm2.Modifiers[];

        /** KeystrokeNotification keyCode. */
        public keyCode: number;

        /** KeystrokeNotification session. */
        public session: string;

        /** KeystrokeNotification action. */
        public action: iterm2.KeystrokeNotification.Action;

        /**
         * Creates a new KeystrokeNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns KeystrokeNotification instance
         */
        public static create(properties?: iterm2.IKeystrokeNotification): iterm2.KeystrokeNotification;

        /**
         * Encodes the specified KeystrokeNotification message. Does not implicitly {@link iterm2.KeystrokeNotification.verify|verify} messages.
         * @param message KeystrokeNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IKeystrokeNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified KeystrokeNotification message, length delimited. Does not implicitly {@link iterm2.KeystrokeNotification.verify|verify} messages.
         * @param message KeystrokeNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IKeystrokeNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a KeystrokeNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns KeystrokeNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.KeystrokeNotification;

        /**
         * Decodes a KeystrokeNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns KeystrokeNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.KeystrokeNotification;

        /**
         * Verifies a KeystrokeNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a KeystrokeNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns KeystrokeNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.KeystrokeNotification;

        /**
         * Creates a plain object from a KeystrokeNotification message. Also converts values to other types if specified.
         * @param message KeystrokeNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.KeystrokeNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this KeystrokeNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for KeystrokeNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace KeystrokeNotification {

        /** Action enum. */
        enum Action {
            KEY_DOWN = 0,
            KEY_UP = 1,
            FLAGS_CHANGED = 2
        }
    }

    /** Properties of a ScreenUpdateNotification. */
    interface IScreenUpdateNotification {

        /** ScreenUpdateNotification session */
        session?: (string|null);
    }

    /** Represents a ScreenUpdateNotification. */
    class ScreenUpdateNotification implements IScreenUpdateNotification {

        /**
         * Constructs a new ScreenUpdateNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IScreenUpdateNotification);

        /** ScreenUpdateNotification session. */
        public session: string;

        /**
         * Creates a new ScreenUpdateNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ScreenUpdateNotification instance
         */
        public static create(properties?: iterm2.IScreenUpdateNotification): iterm2.ScreenUpdateNotification;

        /**
         * Encodes the specified ScreenUpdateNotification message. Does not implicitly {@link iterm2.ScreenUpdateNotification.verify|verify} messages.
         * @param message ScreenUpdateNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IScreenUpdateNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ScreenUpdateNotification message, length delimited. Does not implicitly {@link iterm2.ScreenUpdateNotification.verify|verify} messages.
         * @param message ScreenUpdateNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IScreenUpdateNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ScreenUpdateNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ScreenUpdateNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ScreenUpdateNotification;

        /**
         * Decodes a ScreenUpdateNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ScreenUpdateNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ScreenUpdateNotification;

        /**
         * Verifies a ScreenUpdateNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ScreenUpdateNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ScreenUpdateNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ScreenUpdateNotification;

        /**
         * Creates a plain object from a ScreenUpdateNotification message. Also converts values to other types if specified.
         * @param message ScreenUpdateNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ScreenUpdateNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ScreenUpdateNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ScreenUpdateNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PromptNotificationPrompt. */
    interface IPromptNotificationPrompt {

        /** PromptNotificationPrompt placeholder */
        placeholder?: (string|null);

        /** PromptNotificationPrompt prompt */
        prompt?: (iterm2.IGetPromptResponse|null);
    }

    /** Represents a PromptNotificationPrompt. */
    class PromptNotificationPrompt implements IPromptNotificationPrompt {

        /**
         * Constructs a new PromptNotificationPrompt.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPromptNotificationPrompt);

        /** PromptNotificationPrompt placeholder. */
        public placeholder: string;

        /** PromptNotificationPrompt prompt. */
        public prompt?: (iterm2.IGetPromptResponse|null);

        /**
         * Creates a new PromptNotificationPrompt instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PromptNotificationPrompt instance
         */
        public static create(properties?: iterm2.IPromptNotificationPrompt): iterm2.PromptNotificationPrompt;

        /**
         * Encodes the specified PromptNotificationPrompt message. Does not implicitly {@link iterm2.PromptNotificationPrompt.verify|verify} messages.
         * @param message PromptNotificationPrompt message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPromptNotificationPrompt, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PromptNotificationPrompt message, length delimited. Does not implicitly {@link iterm2.PromptNotificationPrompt.verify|verify} messages.
         * @param message PromptNotificationPrompt message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPromptNotificationPrompt, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PromptNotificationPrompt message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PromptNotificationPrompt
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PromptNotificationPrompt;

        /**
         * Decodes a PromptNotificationPrompt message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PromptNotificationPrompt
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PromptNotificationPrompt;

        /**
         * Verifies a PromptNotificationPrompt message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PromptNotificationPrompt message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PromptNotificationPrompt
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PromptNotificationPrompt;

        /**
         * Creates a plain object from a PromptNotificationPrompt message. Also converts values to other types if specified.
         * @param message PromptNotificationPrompt
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PromptNotificationPrompt, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PromptNotificationPrompt to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PromptNotificationPrompt
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PromptNotificationCommandStart. */
    interface IPromptNotificationCommandStart {

        /** PromptNotificationCommandStart command */
        command?: (string|null);
    }

    /** Represents a PromptNotificationCommandStart. */
    class PromptNotificationCommandStart implements IPromptNotificationCommandStart {

        /**
         * Constructs a new PromptNotificationCommandStart.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPromptNotificationCommandStart);

        /** PromptNotificationCommandStart command. */
        public command: string;

        /**
         * Creates a new PromptNotificationCommandStart instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PromptNotificationCommandStart instance
         */
        public static create(properties?: iterm2.IPromptNotificationCommandStart): iterm2.PromptNotificationCommandStart;

        /**
         * Encodes the specified PromptNotificationCommandStart message. Does not implicitly {@link iterm2.PromptNotificationCommandStart.verify|verify} messages.
         * @param message PromptNotificationCommandStart message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPromptNotificationCommandStart, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PromptNotificationCommandStart message, length delimited. Does not implicitly {@link iterm2.PromptNotificationCommandStart.verify|verify} messages.
         * @param message PromptNotificationCommandStart message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPromptNotificationCommandStart, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PromptNotificationCommandStart message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PromptNotificationCommandStart
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PromptNotificationCommandStart;

        /**
         * Decodes a PromptNotificationCommandStart message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PromptNotificationCommandStart
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PromptNotificationCommandStart;

        /**
         * Verifies a PromptNotificationCommandStart message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PromptNotificationCommandStart message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PromptNotificationCommandStart
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PromptNotificationCommandStart;

        /**
         * Creates a plain object from a PromptNotificationCommandStart message. Also converts values to other types if specified.
         * @param message PromptNotificationCommandStart
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PromptNotificationCommandStart, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PromptNotificationCommandStart to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PromptNotificationCommandStart
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PromptNotificationCommandEnd. */
    interface IPromptNotificationCommandEnd {

        /** PromptNotificationCommandEnd status */
        status?: (number|null);
    }

    /** Represents a PromptNotificationCommandEnd. */
    class PromptNotificationCommandEnd implements IPromptNotificationCommandEnd {

        /**
         * Constructs a new PromptNotificationCommandEnd.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPromptNotificationCommandEnd);

        /** PromptNotificationCommandEnd status. */
        public status: number;

        /**
         * Creates a new PromptNotificationCommandEnd instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PromptNotificationCommandEnd instance
         */
        public static create(properties?: iterm2.IPromptNotificationCommandEnd): iterm2.PromptNotificationCommandEnd;

        /**
         * Encodes the specified PromptNotificationCommandEnd message. Does not implicitly {@link iterm2.PromptNotificationCommandEnd.verify|verify} messages.
         * @param message PromptNotificationCommandEnd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPromptNotificationCommandEnd, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PromptNotificationCommandEnd message, length delimited. Does not implicitly {@link iterm2.PromptNotificationCommandEnd.verify|verify} messages.
         * @param message PromptNotificationCommandEnd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPromptNotificationCommandEnd, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PromptNotificationCommandEnd message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PromptNotificationCommandEnd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PromptNotificationCommandEnd;

        /**
         * Decodes a PromptNotificationCommandEnd message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PromptNotificationCommandEnd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PromptNotificationCommandEnd;

        /**
         * Verifies a PromptNotificationCommandEnd message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PromptNotificationCommandEnd message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PromptNotificationCommandEnd
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PromptNotificationCommandEnd;

        /**
         * Creates a plain object from a PromptNotificationCommandEnd message. Also converts values to other types if specified.
         * @param message PromptNotificationCommandEnd
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PromptNotificationCommandEnd, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PromptNotificationCommandEnd to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PromptNotificationCommandEnd
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PromptNotification. */
    interface IPromptNotification {

        /** PromptNotification session */
        session?: (string|null);

        /** PromptNotification prompt */
        prompt?: (iterm2.IPromptNotificationPrompt|null);

        /** PromptNotification commandStart */
        commandStart?: (iterm2.IPromptNotificationCommandStart|null);

        /** PromptNotification commandEnd */
        commandEnd?: (iterm2.IPromptNotificationCommandEnd|null);

        /** PromptNotification uniquePromptId */
        uniquePromptId?: (string|null);
    }

    /** Represents a PromptNotification. */
    class PromptNotification implements IPromptNotification {

        /**
         * Constructs a new PromptNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPromptNotification);

        /** PromptNotification session. */
        public session: string;

        /** PromptNotification prompt. */
        public prompt?: (iterm2.IPromptNotificationPrompt|null);

        /** PromptNotification commandStart. */
        public commandStart?: (iterm2.IPromptNotificationCommandStart|null);

        /** PromptNotification commandEnd. */
        public commandEnd?: (iterm2.IPromptNotificationCommandEnd|null);

        /** PromptNotification uniquePromptId. */
        public uniquePromptId: string;

        /** PromptNotification event. */
        public event?: ("prompt"|"commandStart"|"commandEnd");

        /**
         * Creates a new PromptNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PromptNotification instance
         */
        public static create(properties?: iterm2.IPromptNotification): iterm2.PromptNotification;

        /**
         * Encodes the specified PromptNotification message. Does not implicitly {@link iterm2.PromptNotification.verify|verify} messages.
         * @param message PromptNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPromptNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PromptNotification message, length delimited. Does not implicitly {@link iterm2.PromptNotification.verify|verify} messages.
         * @param message PromptNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPromptNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PromptNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PromptNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.PromptNotification;

        /**
         * Decodes a PromptNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PromptNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.PromptNotification;

        /**
         * Verifies a PromptNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PromptNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PromptNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.PromptNotification;

        /**
         * Creates a plain object from a PromptNotification message. Also converts values to other types if specified.
         * @param message PromptNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.PromptNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PromptNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PromptNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LocationChangeNotification. */
    interface ILocationChangeNotification {

        /** LocationChangeNotification hostName */
        hostName?: (string|null);

        /** LocationChangeNotification userName */
        userName?: (string|null);

        /** LocationChangeNotification directory */
        directory?: (string|null);

        /** LocationChangeNotification session */
        session?: (string|null);
    }

    /** Represents a LocationChangeNotification. */
    class LocationChangeNotification implements ILocationChangeNotification {

        /**
         * Constructs a new LocationChangeNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ILocationChangeNotification);

        /** LocationChangeNotification hostName. */
        public hostName: string;

        /** LocationChangeNotification userName. */
        public userName: string;

        /** LocationChangeNotification directory. */
        public directory: string;

        /** LocationChangeNotification session. */
        public session: string;

        /**
         * Creates a new LocationChangeNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LocationChangeNotification instance
         */
        public static create(properties?: iterm2.ILocationChangeNotification): iterm2.LocationChangeNotification;

        /**
         * Encodes the specified LocationChangeNotification message. Does not implicitly {@link iterm2.LocationChangeNotification.verify|verify} messages.
         * @param message LocationChangeNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ILocationChangeNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LocationChangeNotification message, length delimited. Does not implicitly {@link iterm2.LocationChangeNotification.verify|verify} messages.
         * @param message LocationChangeNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ILocationChangeNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LocationChangeNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LocationChangeNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.LocationChangeNotification;

        /**
         * Decodes a LocationChangeNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LocationChangeNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.LocationChangeNotification;

        /**
         * Verifies a LocationChangeNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LocationChangeNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LocationChangeNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.LocationChangeNotification;

        /**
         * Creates a plain object from a LocationChangeNotification message. Also converts values to other types if specified.
         * @param message LocationChangeNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.LocationChangeNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LocationChangeNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LocationChangeNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CustomEscapeSequenceNotification. */
    interface ICustomEscapeSequenceNotification {

        /** CustomEscapeSequenceNotification session */
        session?: (string|null);

        /** CustomEscapeSequenceNotification senderIdentity */
        senderIdentity?: (string|null);

        /** CustomEscapeSequenceNotification payload */
        payload?: (string|null);
    }

    /** Represents a CustomEscapeSequenceNotification. */
    class CustomEscapeSequenceNotification implements ICustomEscapeSequenceNotification {

        /**
         * Constructs a new CustomEscapeSequenceNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICustomEscapeSequenceNotification);

        /** CustomEscapeSequenceNotification session. */
        public session: string;

        /** CustomEscapeSequenceNotification senderIdentity. */
        public senderIdentity: string;

        /** CustomEscapeSequenceNotification payload. */
        public payload: string;

        /**
         * Creates a new CustomEscapeSequenceNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CustomEscapeSequenceNotification instance
         */
        public static create(properties?: iterm2.ICustomEscapeSequenceNotification): iterm2.CustomEscapeSequenceNotification;

        /**
         * Encodes the specified CustomEscapeSequenceNotification message. Does not implicitly {@link iterm2.CustomEscapeSequenceNotification.verify|verify} messages.
         * @param message CustomEscapeSequenceNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICustomEscapeSequenceNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CustomEscapeSequenceNotification message, length delimited. Does not implicitly {@link iterm2.CustomEscapeSequenceNotification.verify|verify} messages.
         * @param message CustomEscapeSequenceNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICustomEscapeSequenceNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CustomEscapeSequenceNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CustomEscapeSequenceNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CustomEscapeSequenceNotification;

        /**
         * Decodes a CustomEscapeSequenceNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CustomEscapeSequenceNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CustomEscapeSequenceNotification;

        /**
         * Verifies a CustomEscapeSequenceNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CustomEscapeSequenceNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CustomEscapeSequenceNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CustomEscapeSequenceNotification;

        /**
         * Creates a plain object from a CustomEscapeSequenceNotification message. Also converts values to other types if specified.
         * @param message CustomEscapeSequenceNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CustomEscapeSequenceNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CustomEscapeSequenceNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CustomEscapeSequenceNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a NewSessionNotification. */
    interface INewSessionNotification {

        /** NewSessionNotification sessionId */
        sessionId?: (string|null);
    }

    /** Represents a NewSessionNotification. */
    class NewSessionNotification implements INewSessionNotification {

        /**
         * Constructs a new NewSessionNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.INewSessionNotification);

        /** NewSessionNotification sessionId. */
        public sessionId: string;

        /**
         * Creates a new NewSessionNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NewSessionNotification instance
         */
        public static create(properties?: iterm2.INewSessionNotification): iterm2.NewSessionNotification;

        /**
         * Encodes the specified NewSessionNotification message. Does not implicitly {@link iterm2.NewSessionNotification.verify|verify} messages.
         * @param message NewSessionNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.INewSessionNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified NewSessionNotification message, length delimited. Does not implicitly {@link iterm2.NewSessionNotification.verify|verify} messages.
         * @param message NewSessionNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.INewSessionNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NewSessionNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NewSessionNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.NewSessionNotification;

        /**
         * Decodes a NewSessionNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns NewSessionNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.NewSessionNotification;

        /**
         * Verifies a NewSessionNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a NewSessionNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns NewSessionNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.NewSessionNotification;

        /**
         * Creates a plain object from a NewSessionNotification message. Also converts values to other types if specified.
         * @param message NewSessionNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.NewSessionNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this NewSessionNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for NewSessionNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a FocusChangedNotification. */
    interface IFocusChangedNotification {

        /** FocusChangedNotification applicationActive */
        applicationActive?: (boolean|null);

        /** FocusChangedNotification window */
        window?: (iterm2.FocusChangedNotification.IWindow|null);

        /** FocusChangedNotification selectedTab */
        selectedTab?: (string|null);

        /** FocusChangedNotification session */
        session?: (string|null);
    }

    /** Represents a FocusChangedNotification. */
    class FocusChangedNotification implements IFocusChangedNotification {

        /**
         * Constructs a new FocusChangedNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IFocusChangedNotification);

        /** FocusChangedNotification applicationActive. */
        public applicationActive?: (boolean|null);

        /** FocusChangedNotification window. */
        public window?: (iterm2.FocusChangedNotification.IWindow|null);

        /** FocusChangedNotification selectedTab. */
        public selectedTab?: (string|null);

        /** FocusChangedNotification session. */
        public session?: (string|null);

        /** FocusChangedNotification event. */
        public event?: ("applicationActive"|"window"|"selectedTab"|"session");

        /**
         * Creates a new FocusChangedNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FocusChangedNotification instance
         */
        public static create(properties?: iterm2.IFocusChangedNotification): iterm2.FocusChangedNotification;

        /**
         * Encodes the specified FocusChangedNotification message. Does not implicitly {@link iterm2.FocusChangedNotification.verify|verify} messages.
         * @param message FocusChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IFocusChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FocusChangedNotification message, length delimited. Does not implicitly {@link iterm2.FocusChangedNotification.verify|verify} messages.
         * @param message FocusChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IFocusChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FocusChangedNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FocusChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.FocusChangedNotification;

        /**
         * Decodes a FocusChangedNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FocusChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.FocusChangedNotification;

        /**
         * Verifies a FocusChangedNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FocusChangedNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FocusChangedNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.FocusChangedNotification;

        /**
         * Creates a plain object from a FocusChangedNotification message. Also converts values to other types if specified.
         * @param message FocusChangedNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.FocusChangedNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FocusChangedNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FocusChangedNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace FocusChangedNotification {

        /** Properties of a Window. */
        interface IWindow {

            /** Window windowStatus */
            windowStatus?: (iterm2.FocusChangedNotification.Window.WindowStatus|null);

            /** Window windowId */
            windowId?: (string|null);
        }

        /** Represents a Window. */
        class Window implements IWindow {

            /**
             * Constructs a new Window.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.FocusChangedNotification.IWindow);

            /** Window windowStatus. */
            public windowStatus: iterm2.FocusChangedNotification.Window.WindowStatus;

            /** Window windowId. */
            public windowId: string;

            /**
             * Creates a new Window instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Window instance
             */
            public static create(properties?: iterm2.FocusChangedNotification.IWindow): iterm2.FocusChangedNotification.Window;

            /**
             * Encodes the specified Window message. Does not implicitly {@link iterm2.FocusChangedNotification.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.FocusChangedNotification.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Window message, length delimited. Does not implicitly {@link iterm2.FocusChangedNotification.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.FocusChangedNotification.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Window message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.FocusChangedNotification.Window;

            /**
             * Decodes a Window message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.FocusChangedNotification.Window;

            /**
             * Verifies a Window message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Window message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Window
             */
            public static fromObject(object: { [k: string]: any }): iterm2.FocusChangedNotification.Window;

            /**
             * Creates a plain object from a Window message. Also converts values to other types if specified.
             * @param message Window
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.FocusChangedNotification.Window, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Window to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Window
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace Window {

            /** WindowStatus enum. */
            enum WindowStatus {
                TERMINAL_WINDOW_BECAME_KEY = 0,
                TERMINAL_WINDOW_IS_CURRENT = 1,
                TERMINAL_WINDOW_RESIGNED_KEY = 2
            }
        }
    }

    /** Properties of a TerminateSessionNotification. */
    interface ITerminateSessionNotification {

        /** TerminateSessionNotification sessionId */
        sessionId?: (string|null);
    }

    /** Represents a TerminateSessionNotification. */
    class TerminateSessionNotification implements ITerminateSessionNotification {

        /**
         * Constructs a new TerminateSessionNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ITerminateSessionNotification);

        /** TerminateSessionNotification sessionId. */
        public sessionId: string;

        /**
         * Creates a new TerminateSessionNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminateSessionNotification instance
         */
        public static create(properties?: iterm2.ITerminateSessionNotification): iterm2.TerminateSessionNotification;

        /**
         * Encodes the specified TerminateSessionNotification message. Does not implicitly {@link iterm2.TerminateSessionNotification.verify|verify} messages.
         * @param message TerminateSessionNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ITerminateSessionNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminateSessionNotification message, length delimited. Does not implicitly {@link iterm2.TerminateSessionNotification.verify|verify} messages.
         * @param message TerminateSessionNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ITerminateSessionNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminateSessionNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TerminateSessionNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TerminateSessionNotification;

        /**
         * Decodes a TerminateSessionNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TerminateSessionNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TerminateSessionNotification;

        /**
         * Verifies a TerminateSessionNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminateSessionNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminateSessionNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.TerminateSessionNotification;

        /**
         * Creates a plain object from a TerminateSessionNotification message. Also converts values to other types if specified.
         * @param message TerminateSessionNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.TerminateSessionNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminateSessionNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TerminateSessionNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LayoutChangedNotification. */
    interface ILayoutChangedNotification {

        /** LayoutChangedNotification listSessionsResponse */
        listSessionsResponse?: (iterm2.IListSessionsResponse|null);
    }

    /** Represents a LayoutChangedNotification. */
    class LayoutChangedNotification implements ILayoutChangedNotification {

        /**
         * Constructs a new LayoutChangedNotification.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ILayoutChangedNotification);

        /** LayoutChangedNotification listSessionsResponse. */
        public listSessionsResponse?: (iterm2.IListSessionsResponse|null);

        /**
         * Creates a new LayoutChangedNotification instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LayoutChangedNotification instance
         */
        public static create(properties?: iterm2.ILayoutChangedNotification): iterm2.LayoutChangedNotification;

        /**
         * Encodes the specified LayoutChangedNotification message. Does not implicitly {@link iterm2.LayoutChangedNotification.verify|verify} messages.
         * @param message LayoutChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ILayoutChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LayoutChangedNotification message, length delimited. Does not implicitly {@link iterm2.LayoutChangedNotification.verify|verify} messages.
         * @param message LayoutChangedNotification message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ILayoutChangedNotification, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LayoutChangedNotification message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LayoutChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.LayoutChangedNotification;

        /**
         * Decodes a LayoutChangedNotification message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LayoutChangedNotification
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.LayoutChangedNotification;

        /**
         * Verifies a LayoutChangedNotification message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LayoutChangedNotification message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LayoutChangedNotification
         */
        public static fromObject(object: { [k: string]: any }): iterm2.LayoutChangedNotification;

        /**
         * Creates a plain object from a LayoutChangedNotification message. Also converts values to other types if specified.
         * @param message LayoutChangedNotification
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.LayoutChangedNotification, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LayoutChangedNotification to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LayoutChangedNotification
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetBufferRequest. */
    interface IGetBufferRequest {

        /** GetBufferRequest session */
        session?: (string|null);

        /** GetBufferRequest lineRange */
        lineRange?: (iterm2.ILineRange|null);

        /** GetBufferRequest includeStyles */
        includeStyles?: (boolean|null);
    }

    /** Represents a GetBufferRequest. */
    class GetBufferRequest implements IGetBufferRequest {

        /**
         * Constructs a new GetBufferRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetBufferRequest);

        /** GetBufferRequest session. */
        public session: string;

        /** GetBufferRequest lineRange. */
        public lineRange?: (iterm2.ILineRange|null);

        /** GetBufferRequest includeStyles. */
        public includeStyles: boolean;

        /**
         * Creates a new GetBufferRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBufferRequest instance
         */
        public static create(properties?: iterm2.IGetBufferRequest): iterm2.GetBufferRequest;

        /**
         * Encodes the specified GetBufferRequest message. Does not implicitly {@link iterm2.GetBufferRequest.verify|verify} messages.
         * @param message GetBufferRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetBufferRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBufferRequest message, length delimited. Does not implicitly {@link iterm2.GetBufferRequest.verify|verify} messages.
         * @param message GetBufferRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetBufferRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBufferRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBufferRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetBufferRequest;

        /**
         * Decodes a GetBufferRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBufferRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetBufferRequest;

        /**
         * Verifies a GetBufferRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBufferRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBufferRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetBufferRequest;

        /**
         * Creates a plain object from a GetBufferRequest message. Also converts values to other types if specified.
         * @param message GetBufferRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetBufferRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBufferRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBufferRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetBufferResponse. */
    interface IGetBufferResponse {

        /** GetBufferResponse status */
        status?: (iterm2.GetBufferResponse.Status|null);

        /** GetBufferResponse range */
        range?: (iterm2.IRange|null);

        /** GetBufferResponse contents */
        contents?: (iterm2.ILineContents[]|null);

        /** GetBufferResponse cursor */
        cursor?: (iterm2.ICoord|null);

        /** GetBufferResponse numLinesAboveScreen */
        numLinesAboveScreen?: (number|Long|null);

        /** GetBufferResponse windowedCoordRange */
        windowedCoordRange?: (iterm2.IWindowedCoordRange|null);
    }

    /** Represents a GetBufferResponse. */
    class GetBufferResponse implements IGetBufferResponse {

        /**
         * Constructs a new GetBufferResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetBufferResponse);

        /** GetBufferResponse status. */
        public status: iterm2.GetBufferResponse.Status;

        /** GetBufferResponse range. */
        public range?: (iterm2.IRange|null);

        /** GetBufferResponse contents. */
        public contents: iterm2.ILineContents[];

        /** GetBufferResponse cursor. */
        public cursor?: (iterm2.ICoord|null);

        /** GetBufferResponse numLinesAboveScreen. */
        public numLinesAboveScreen: (number|Long);

        /** GetBufferResponse windowedCoordRange. */
        public windowedCoordRange?: (iterm2.IWindowedCoordRange|null);

        /**
         * Creates a new GetBufferResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetBufferResponse instance
         */
        public static create(properties?: iterm2.IGetBufferResponse): iterm2.GetBufferResponse;

        /**
         * Encodes the specified GetBufferResponse message. Does not implicitly {@link iterm2.GetBufferResponse.verify|verify} messages.
         * @param message GetBufferResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetBufferResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetBufferResponse message, length delimited. Does not implicitly {@link iterm2.GetBufferResponse.verify|verify} messages.
         * @param message GetBufferResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetBufferResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetBufferResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetBufferResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetBufferResponse;

        /**
         * Decodes a GetBufferResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetBufferResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetBufferResponse;

        /**
         * Verifies a GetBufferResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetBufferResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetBufferResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetBufferResponse;

        /**
         * Creates a plain object from a GetBufferResponse message. Also converts values to other types if specified.
         * @param message GetBufferResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetBufferResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetBufferResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetBufferResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace GetBufferResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            INVALID_LINE_RANGE = 2,
            REQUEST_MALFORMED = 3
        }
    }

    /** Properties of a GetPromptRequest. */
    interface IGetPromptRequest {

        /** GetPromptRequest session */
        session?: (string|null);

        /** GetPromptRequest uniquePromptId */
        uniquePromptId?: (string|null);
    }

    /** Represents a GetPromptRequest. */
    class GetPromptRequest implements IGetPromptRequest {

        /**
         * Constructs a new GetPromptRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetPromptRequest);

        /** GetPromptRequest session. */
        public session: string;

        /** GetPromptRequest uniquePromptId. */
        public uniquePromptId: string;

        /**
         * Creates a new GetPromptRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPromptRequest instance
         */
        public static create(properties?: iterm2.IGetPromptRequest): iterm2.GetPromptRequest;

        /**
         * Encodes the specified GetPromptRequest message. Does not implicitly {@link iterm2.GetPromptRequest.verify|verify} messages.
         * @param message GetPromptRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetPromptRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPromptRequest message, length delimited. Does not implicitly {@link iterm2.GetPromptRequest.verify|verify} messages.
         * @param message GetPromptRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetPromptRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPromptRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPromptRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetPromptRequest;

        /**
         * Decodes a GetPromptRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPromptRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetPromptRequest;

        /**
         * Verifies a GetPromptRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPromptRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPromptRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetPromptRequest;

        /**
         * Creates a plain object from a GetPromptRequest message. Also converts values to other types if specified.
         * @param message GetPromptRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetPromptRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPromptRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPromptRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetPromptResponse. */
    interface IGetPromptResponse {

        /** GetPromptResponse status */
        status?: (iterm2.GetPromptResponse.Status|null);

        /** GetPromptResponse promptRange */
        promptRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse commandRange */
        commandRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse outputRange */
        outputRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse workingDirectory */
        workingDirectory?: (string|null);

        /** GetPromptResponse command */
        command?: (string|null);

        /** GetPromptResponse promptState */
        promptState?: (iterm2.GetPromptResponse.State|null);

        /** GetPromptResponse exitStatus */
        exitStatus?: (number|null);

        /** GetPromptResponse uniquePromptId */
        uniquePromptId?: (string|null);
    }

    /** Represents a GetPromptResponse. */
    class GetPromptResponse implements IGetPromptResponse {

        /**
         * Constructs a new GetPromptResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetPromptResponse);

        /** GetPromptResponse status. */
        public status: iterm2.GetPromptResponse.Status;

        /** GetPromptResponse promptRange. */
        public promptRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse commandRange. */
        public commandRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse outputRange. */
        public outputRange?: (iterm2.ICoordRange|null);

        /** GetPromptResponse workingDirectory. */
        public workingDirectory: string;

        /** GetPromptResponse command. */
        public command: string;

        /** GetPromptResponse promptState. */
        public promptState: iterm2.GetPromptResponse.State;

        /** GetPromptResponse exitStatus. */
        public exitStatus: number;

        /** GetPromptResponse uniquePromptId. */
        public uniquePromptId: string;

        /**
         * Creates a new GetPromptResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPromptResponse instance
         */
        public static create(properties?: iterm2.IGetPromptResponse): iterm2.GetPromptResponse;

        /**
         * Encodes the specified GetPromptResponse message. Does not implicitly {@link iterm2.GetPromptResponse.verify|verify} messages.
         * @param message GetPromptResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetPromptResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetPromptResponse message, length delimited. Does not implicitly {@link iterm2.GetPromptResponse.verify|verify} messages.
         * @param message GetPromptResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetPromptResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPromptResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetPromptResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetPromptResponse;

        /**
         * Decodes a GetPromptResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetPromptResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetPromptResponse;

        /**
         * Verifies a GetPromptResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetPromptResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetPromptResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetPromptResponse;

        /**
         * Creates a plain object from a GetPromptResponse message. Also converts values to other types if specified.
         * @param message GetPromptResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetPromptResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetPromptResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetPromptResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace GetPromptResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2,
            PROMPT_UNAVAILABLE = 3
        }

        /** State enum. */
        enum State {
            EDITING = 0,
            RUNNING = 1,
            FINISHED = 2
        }
    }

    /** Properties of a ListPromptsRequest. */
    interface IListPromptsRequest {

        /** ListPromptsRequest session */
        session?: (string|null);

        /** ListPromptsRequest firstUniqueId */
        firstUniqueId?: (string|null);

        /** ListPromptsRequest lastUniqueId */
        lastUniqueId?: (string|null);
    }

    /** Represents a ListPromptsRequest. */
    class ListPromptsRequest implements IListPromptsRequest {

        /**
         * Constructs a new ListPromptsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListPromptsRequest);

        /** ListPromptsRequest session. */
        public session: string;

        /** ListPromptsRequest firstUniqueId. */
        public firstUniqueId: string;

        /** ListPromptsRequest lastUniqueId. */
        public lastUniqueId: string;

        /**
         * Creates a new ListPromptsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListPromptsRequest instance
         */
        public static create(properties?: iterm2.IListPromptsRequest): iterm2.ListPromptsRequest;

        /**
         * Encodes the specified ListPromptsRequest message. Does not implicitly {@link iterm2.ListPromptsRequest.verify|verify} messages.
         * @param message ListPromptsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListPromptsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListPromptsRequest message, length delimited. Does not implicitly {@link iterm2.ListPromptsRequest.verify|verify} messages.
         * @param message ListPromptsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListPromptsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListPromptsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListPromptsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListPromptsRequest;

        /**
         * Decodes a ListPromptsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListPromptsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListPromptsRequest;

        /**
         * Verifies a ListPromptsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListPromptsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListPromptsRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListPromptsRequest;

        /**
         * Creates a plain object from a ListPromptsRequest message. Also converts values to other types if specified.
         * @param message ListPromptsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListPromptsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListPromptsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListPromptsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListPromptsResponse. */
    interface IListPromptsResponse {

        /** ListPromptsResponse status */
        status?: (iterm2.ListPromptsResponse.Status|null);

        /** ListPromptsResponse uniquePromptId */
        uniquePromptId?: (string[]|null);
    }

    /** Represents a ListPromptsResponse. */
    class ListPromptsResponse implements IListPromptsResponse {

        /**
         * Constructs a new ListPromptsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListPromptsResponse);

        /** ListPromptsResponse status. */
        public status: iterm2.ListPromptsResponse.Status;

        /** ListPromptsResponse uniquePromptId. */
        public uniquePromptId: string[];

        /**
         * Creates a new ListPromptsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListPromptsResponse instance
         */
        public static create(properties?: iterm2.IListPromptsResponse): iterm2.ListPromptsResponse;

        /**
         * Encodes the specified ListPromptsResponse message. Does not implicitly {@link iterm2.ListPromptsResponse.verify|verify} messages.
         * @param message ListPromptsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListPromptsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListPromptsResponse message, length delimited. Does not implicitly {@link iterm2.ListPromptsResponse.verify|verify} messages.
         * @param message ListPromptsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListPromptsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListPromptsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListPromptsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListPromptsResponse;

        /**
         * Decodes a ListPromptsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListPromptsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListPromptsResponse;

        /**
         * Verifies a ListPromptsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListPromptsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListPromptsResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListPromptsResponse;

        /**
         * Creates a plain object from a ListPromptsResponse message. Also converts values to other types if specified.
         * @param message ListPromptsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListPromptsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListPromptsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListPromptsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ListPromptsResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1
        }
    }

    /** Properties of a GetProfilePropertyRequest. */
    interface IGetProfilePropertyRequest {

        /** GetProfilePropertyRequest session */
        session?: (string|null);

        /** GetProfilePropertyRequest keys */
        keys?: (string[]|null);
    }

    /** Represents a GetProfilePropertyRequest. */
    class GetProfilePropertyRequest implements IGetProfilePropertyRequest {

        /**
         * Constructs a new GetProfilePropertyRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetProfilePropertyRequest);

        /** GetProfilePropertyRequest session. */
        public session: string;

        /** GetProfilePropertyRequest keys. */
        public keys: string[];

        /**
         * Creates a new GetProfilePropertyRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProfilePropertyRequest instance
         */
        public static create(properties?: iterm2.IGetProfilePropertyRequest): iterm2.GetProfilePropertyRequest;

        /**
         * Encodes the specified GetProfilePropertyRequest message. Does not implicitly {@link iterm2.GetProfilePropertyRequest.verify|verify} messages.
         * @param message GetProfilePropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetProfilePropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProfilePropertyRequest message, length delimited. Does not implicitly {@link iterm2.GetProfilePropertyRequest.verify|verify} messages.
         * @param message GetProfilePropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetProfilePropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProfilePropertyRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetProfilePropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetProfilePropertyRequest;

        /**
         * Decodes a GetProfilePropertyRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetProfilePropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetProfilePropertyRequest;

        /**
         * Verifies a GetProfilePropertyRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProfilePropertyRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProfilePropertyRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetProfilePropertyRequest;

        /**
         * Creates a plain object from a GetProfilePropertyRequest message. Also converts values to other types if specified.
         * @param message GetProfilePropertyRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetProfilePropertyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProfilePropertyRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetProfilePropertyRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ProfileProperty. */
    interface IProfileProperty {

        /** ProfileProperty key */
        key?: (string|null);

        /** ProfileProperty jsonValue */
        jsonValue?: (string|null);
    }

    /** Represents a ProfileProperty. */
    class ProfileProperty implements IProfileProperty {

        /**
         * Constructs a new ProfileProperty.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IProfileProperty);

        /** ProfileProperty key. */
        public key: string;

        /** ProfileProperty jsonValue. */
        public jsonValue: string;

        /**
         * Creates a new ProfileProperty instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProfileProperty instance
         */
        public static create(properties?: iterm2.IProfileProperty): iterm2.ProfileProperty;

        /**
         * Encodes the specified ProfileProperty message. Does not implicitly {@link iterm2.ProfileProperty.verify|verify} messages.
         * @param message ProfileProperty message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IProfileProperty, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProfileProperty message, length delimited. Does not implicitly {@link iterm2.ProfileProperty.verify|verify} messages.
         * @param message ProfileProperty message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IProfileProperty, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProfileProperty message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProfileProperty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ProfileProperty;

        /**
         * Decodes a ProfileProperty message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProfileProperty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ProfileProperty;

        /**
         * Verifies a ProfileProperty message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProfileProperty message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProfileProperty
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ProfileProperty;

        /**
         * Creates a plain object from a ProfileProperty message. Also converts values to other types if specified.
         * @param message ProfileProperty
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ProfileProperty, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProfileProperty to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProfileProperty
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetProfilePropertyResponse. */
    interface IGetProfilePropertyResponse {

        /** GetProfilePropertyResponse status */
        status?: (iterm2.GetProfilePropertyResponse.Status|null);

        /** GetProfilePropertyResponse properties */
        properties?: (iterm2.IProfileProperty[]|null);
    }

    /** Represents a GetProfilePropertyResponse. */
    class GetProfilePropertyResponse implements IGetProfilePropertyResponse {

        /**
         * Constructs a new GetProfilePropertyResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IGetProfilePropertyResponse);

        /** GetProfilePropertyResponse status. */
        public status: iterm2.GetProfilePropertyResponse.Status;

        /** GetProfilePropertyResponse properties. */
        public properties: iterm2.IProfileProperty[];

        /**
         * Creates a new GetProfilePropertyResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetProfilePropertyResponse instance
         */
        public static create(properties?: iterm2.IGetProfilePropertyResponse): iterm2.GetProfilePropertyResponse;

        /**
         * Encodes the specified GetProfilePropertyResponse message. Does not implicitly {@link iterm2.GetProfilePropertyResponse.verify|verify} messages.
         * @param message GetProfilePropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IGetProfilePropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetProfilePropertyResponse message, length delimited. Does not implicitly {@link iterm2.GetProfilePropertyResponse.verify|verify} messages.
         * @param message GetProfilePropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IGetProfilePropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetProfilePropertyResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetProfilePropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.GetProfilePropertyResponse;

        /**
         * Decodes a GetProfilePropertyResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetProfilePropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.GetProfilePropertyResponse;

        /**
         * Verifies a GetProfilePropertyResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetProfilePropertyResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetProfilePropertyResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.GetProfilePropertyResponse;

        /**
         * Creates a plain object from a GetProfilePropertyResponse message. Also converts values to other types if specified.
         * @param message GetProfilePropertyResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.GetProfilePropertyResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetProfilePropertyResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetProfilePropertyResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace GetProfilePropertyResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2,
            ERROR = 3
        }
    }

    /** Properties of a SetProfilePropertyRequest. */
    interface ISetProfilePropertyRequest {

        /** SetProfilePropertyRequest session */
        session?: (string|null);

        /** SetProfilePropertyRequest guidList */
        guidList?: (iterm2.SetProfilePropertyRequest.IGuidList|null);

        /** SetProfilePropertyRequest key */
        key?: (string|null);

        /** SetProfilePropertyRequest jsonValue */
        jsonValue?: (string|null);

        /** SetProfilePropertyRequest assignments */
        assignments?: (iterm2.SetProfilePropertyRequest.IAssignment[]|null);
    }

    /** Represents a SetProfilePropertyRequest. */
    class SetProfilePropertyRequest implements ISetProfilePropertyRequest {

        /**
         * Constructs a new SetProfilePropertyRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetProfilePropertyRequest);

        /** SetProfilePropertyRequest session. */
        public session?: (string|null);

        /** SetProfilePropertyRequest guidList. */
        public guidList?: (iterm2.SetProfilePropertyRequest.IGuidList|null);

        /** SetProfilePropertyRequest key. */
        public key: string;

        /** SetProfilePropertyRequest jsonValue. */
        public jsonValue: string;

        /** SetProfilePropertyRequest assignments. */
        public assignments: iterm2.SetProfilePropertyRequest.IAssignment[];

        /** SetProfilePropertyRequest target. */
        public target?: ("session"|"guidList");

        /**
         * Creates a new SetProfilePropertyRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetProfilePropertyRequest instance
         */
        public static create(properties?: iterm2.ISetProfilePropertyRequest): iterm2.SetProfilePropertyRequest;

        /**
         * Encodes the specified SetProfilePropertyRequest message. Does not implicitly {@link iterm2.SetProfilePropertyRequest.verify|verify} messages.
         * @param message SetProfilePropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetProfilePropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetProfilePropertyRequest message, length delimited. Does not implicitly {@link iterm2.SetProfilePropertyRequest.verify|verify} messages.
         * @param message SetProfilePropertyRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetProfilePropertyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetProfilePropertyRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetProfilePropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetProfilePropertyRequest;

        /**
         * Decodes a SetProfilePropertyRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetProfilePropertyRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetProfilePropertyRequest;

        /**
         * Verifies a SetProfilePropertyRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetProfilePropertyRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetProfilePropertyRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetProfilePropertyRequest;

        /**
         * Creates a plain object from a SetProfilePropertyRequest message. Also converts values to other types if specified.
         * @param message SetProfilePropertyRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetProfilePropertyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetProfilePropertyRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetProfilePropertyRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SetProfilePropertyRequest {

        /** Properties of a GuidList. */
        interface IGuidList {

            /** GuidList guids */
            guids?: (string[]|null);
        }

        /** Represents a GuidList. */
        class GuidList implements IGuidList {

            /**
             * Constructs a new GuidList.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SetProfilePropertyRequest.IGuidList);

            /** GuidList guids. */
            public guids: string[];

            /**
             * Creates a new GuidList instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GuidList instance
             */
            public static create(properties?: iterm2.SetProfilePropertyRequest.IGuidList): iterm2.SetProfilePropertyRequest.GuidList;

            /**
             * Encodes the specified GuidList message. Does not implicitly {@link iterm2.SetProfilePropertyRequest.GuidList.verify|verify} messages.
             * @param message GuidList message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SetProfilePropertyRequest.IGuidList, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GuidList message, length delimited. Does not implicitly {@link iterm2.SetProfilePropertyRequest.GuidList.verify|verify} messages.
             * @param message GuidList message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SetProfilePropertyRequest.IGuidList, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GuidList message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GuidList
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetProfilePropertyRequest.GuidList;

            /**
             * Decodes a GuidList message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GuidList
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetProfilePropertyRequest.GuidList;

            /**
             * Verifies a GuidList message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GuidList message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GuidList
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SetProfilePropertyRequest.GuidList;

            /**
             * Creates a plain object from a GuidList message. Also converts values to other types if specified.
             * @param message GuidList
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SetProfilePropertyRequest.GuidList, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GuidList to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GuidList
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an Assignment. */
        interface IAssignment {

            /** Assignment key */
            key?: (string|null);

            /** Assignment jsonValue */
            jsonValue?: (string|null);
        }

        /** Represents an Assignment. */
        class Assignment implements IAssignment {

            /**
             * Constructs a new Assignment.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SetProfilePropertyRequest.IAssignment);

            /** Assignment key. */
            public key: string;

            /** Assignment jsonValue. */
            public jsonValue: string;

            /**
             * Creates a new Assignment instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Assignment instance
             */
            public static create(properties?: iterm2.SetProfilePropertyRequest.IAssignment): iterm2.SetProfilePropertyRequest.Assignment;

            /**
             * Encodes the specified Assignment message. Does not implicitly {@link iterm2.SetProfilePropertyRequest.Assignment.verify|verify} messages.
             * @param message Assignment message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SetProfilePropertyRequest.IAssignment, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Assignment message, length delimited. Does not implicitly {@link iterm2.SetProfilePropertyRequest.Assignment.verify|verify} messages.
             * @param message Assignment message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SetProfilePropertyRequest.IAssignment, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Assignment message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Assignment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetProfilePropertyRequest.Assignment;

            /**
             * Decodes an Assignment message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Assignment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetProfilePropertyRequest.Assignment;

            /**
             * Verifies an Assignment message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Assignment message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Assignment
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SetProfilePropertyRequest.Assignment;

            /**
             * Creates a plain object from an Assignment message. Also converts values to other types if specified.
             * @param message Assignment
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SetProfilePropertyRequest.Assignment, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Assignment to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Assignment
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a SetProfilePropertyResponse. */
    interface ISetProfilePropertyResponse {

        /** SetProfilePropertyResponse status */
        status?: (iterm2.SetProfilePropertyResponse.Status|null);
    }

    /** Represents a SetProfilePropertyResponse. */
    class SetProfilePropertyResponse implements ISetProfilePropertyResponse {

        /**
         * Constructs a new SetProfilePropertyResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISetProfilePropertyResponse);

        /** SetProfilePropertyResponse status. */
        public status: iterm2.SetProfilePropertyResponse.Status;

        /**
         * Creates a new SetProfilePropertyResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetProfilePropertyResponse instance
         */
        public static create(properties?: iterm2.ISetProfilePropertyResponse): iterm2.SetProfilePropertyResponse;

        /**
         * Encodes the specified SetProfilePropertyResponse message. Does not implicitly {@link iterm2.SetProfilePropertyResponse.verify|verify} messages.
         * @param message SetProfilePropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISetProfilePropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetProfilePropertyResponse message, length delimited. Does not implicitly {@link iterm2.SetProfilePropertyResponse.verify|verify} messages.
         * @param message SetProfilePropertyResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISetProfilePropertyResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetProfilePropertyResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetProfilePropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SetProfilePropertyResponse;

        /**
         * Decodes a SetProfilePropertyResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SetProfilePropertyResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SetProfilePropertyResponse;

        /**
         * Verifies a SetProfilePropertyResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetProfilePropertyResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetProfilePropertyResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SetProfilePropertyResponse;

        /**
         * Creates a plain object from a SetProfilePropertyResponse message. Also converts values to other types if specified.
         * @param message SetProfilePropertyResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SetProfilePropertyResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetProfilePropertyResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SetProfilePropertyResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SetProfilePropertyResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            REQUEST_MALFORMED = 2,
            BAD_GUID = 3
        }
    }

    /** Properties of a TransactionRequest. */
    interface ITransactionRequest {

        /** TransactionRequest begin */
        begin?: (boolean|null);
    }

    /** Represents a TransactionRequest. */
    class TransactionRequest implements ITransactionRequest {

        /**
         * Constructs a new TransactionRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ITransactionRequest);

        /** TransactionRequest begin. */
        public begin: boolean;

        /**
         * Creates a new TransactionRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TransactionRequest instance
         */
        public static create(properties?: iterm2.ITransactionRequest): iterm2.TransactionRequest;

        /**
         * Encodes the specified TransactionRequest message. Does not implicitly {@link iterm2.TransactionRequest.verify|verify} messages.
         * @param message TransactionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ITransactionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TransactionRequest message, length delimited. Does not implicitly {@link iterm2.TransactionRequest.verify|verify} messages.
         * @param message TransactionRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ITransactionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TransactionRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TransactionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TransactionRequest;

        /**
         * Decodes a TransactionRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TransactionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TransactionRequest;

        /**
         * Verifies a TransactionRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TransactionRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TransactionRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.TransactionRequest;

        /**
         * Creates a plain object from a TransactionRequest message. Also converts values to other types if specified.
         * @param message TransactionRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.TransactionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TransactionRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TransactionRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TransactionResponse. */
    interface ITransactionResponse {

        /** TransactionResponse status */
        status?: (iterm2.TransactionResponse.Status|null);
    }

    /** Represents a TransactionResponse. */
    class TransactionResponse implements ITransactionResponse {

        /**
         * Constructs a new TransactionResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ITransactionResponse);

        /** TransactionResponse status. */
        public status: iterm2.TransactionResponse.Status;

        /**
         * Creates a new TransactionResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TransactionResponse instance
         */
        public static create(properties?: iterm2.ITransactionResponse): iterm2.TransactionResponse;

        /**
         * Encodes the specified TransactionResponse message. Does not implicitly {@link iterm2.TransactionResponse.verify|verify} messages.
         * @param message TransactionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ITransactionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TransactionResponse message, length delimited. Does not implicitly {@link iterm2.TransactionResponse.verify|verify} messages.
         * @param message TransactionResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ITransactionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TransactionResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TransactionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.TransactionResponse;

        /**
         * Decodes a TransactionResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TransactionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.TransactionResponse;

        /**
         * Verifies a TransactionResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TransactionResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TransactionResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.TransactionResponse;

        /**
         * Creates a plain object from a TransactionResponse message. Also converts values to other types if specified.
         * @param message TransactionResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.TransactionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TransactionResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TransactionResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace TransactionResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            NO_TRANSACTION = 1,
            ALREADY_IN_TRANSACTION = 2
        }
    }

    /** Properties of a LineRange. */
    interface ILineRange {

        /** LineRange screenContentsOnly */
        screenContentsOnly?: (boolean|null);

        /** LineRange trailingLines */
        trailingLines?: (number|null);

        /** LineRange windowedCoordRange */
        windowedCoordRange?: (iterm2.IWindowedCoordRange|null);
    }

    /** Represents a LineRange. */
    class LineRange implements ILineRange {

        /**
         * Constructs a new LineRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ILineRange);

        /** LineRange screenContentsOnly. */
        public screenContentsOnly: boolean;

        /** LineRange trailingLines. */
        public trailingLines: number;

        /** LineRange windowedCoordRange. */
        public windowedCoordRange?: (iterm2.IWindowedCoordRange|null);

        /**
         * Creates a new LineRange instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LineRange instance
         */
        public static create(properties?: iterm2.ILineRange): iterm2.LineRange;

        /**
         * Encodes the specified LineRange message. Does not implicitly {@link iterm2.LineRange.verify|verify} messages.
         * @param message LineRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ILineRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LineRange message, length delimited. Does not implicitly {@link iterm2.LineRange.verify|verify} messages.
         * @param message LineRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ILineRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LineRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LineRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.LineRange;

        /**
         * Decodes a LineRange message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LineRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.LineRange;

        /**
         * Verifies a LineRange message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LineRange message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LineRange
         */
        public static fromObject(object: { [k: string]: any }): iterm2.LineRange;

        /**
         * Creates a plain object from a LineRange message. Also converts values to other types if specified.
         * @param message LineRange
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.LineRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LineRange to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LineRange
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Range. */
    interface IRange {

        /** Range location */
        location?: (number|Long|null);

        /** Range length */
        length?: (number|Long|null);
    }

    /** Represents a Range. */
    class Range implements IRange {

        /**
         * Constructs a new Range.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRange);

        /** Range location. */
        public location: (number|Long);

        /** Range length. */
        public length: (number|Long);

        /**
         * Creates a new Range instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Range instance
         */
        public static create(properties?: iterm2.IRange): iterm2.Range;

        /**
         * Encodes the specified Range message. Does not implicitly {@link iterm2.Range.verify|verify} messages.
         * @param message Range message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Range message, length delimited. Does not implicitly {@link iterm2.Range.verify|verify} messages.
         * @param message Range message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Range message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Range
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Range;

        /**
         * Decodes a Range message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Range
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Range;

        /**
         * Verifies a Range message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Range message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Range
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Range;

        /**
         * Creates a plain object from a Range message. Also converts values to other types if specified.
         * @param message Range
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Range, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Range to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Range
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CoordRange. */
    interface ICoordRange {

        /** CoordRange start */
        start?: (iterm2.ICoord|null);

        /** CoordRange end */
        end?: (iterm2.ICoord|null);
    }

    /** Represents a CoordRange. */
    class CoordRange implements ICoordRange {

        /**
         * Constructs a new CoordRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICoordRange);

        /** CoordRange start. */
        public start?: (iterm2.ICoord|null);

        /** CoordRange end. */
        public end?: (iterm2.ICoord|null);

        /**
         * Creates a new CoordRange instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CoordRange instance
         */
        public static create(properties?: iterm2.ICoordRange): iterm2.CoordRange;

        /**
         * Encodes the specified CoordRange message. Does not implicitly {@link iterm2.CoordRange.verify|verify} messages.
         * @param message CoordRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICoordRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CoordRange message, length delimited. Does not implicitly {@link iterm2.CoordRange.verify|verify} messages.
         * @param message CoordRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICoordRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CoordRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CoordRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CoordRange;

        /**
         * Decodes a CoordRange message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CoordRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CoordRange;

        /**
         * Verifies a CoordRange message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CoordRange message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CoordRange
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CoordRange;

        /**
         * Creates a plain object from a CoordRange message. Also converts values to other types if specified.
         * @param message CoordRange
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CoordRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CoordRange to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CoordRange
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Coord. */
    interface ICoord {

        /** Coord x */
        x?: (number|null);

        /** Coord y */
        y?: (number|Long|null);
    }

    /** Represents a Coord. */
    class Coord implements ICoord {

        /**
         * Constructs a new Coord.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICoord);

        /** Coord x. */
        public x: number;

        /** Coord y. */
        public y: (number|Long);

        /**
         * Creates a new Coord instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Coord instance
         */
        public static create(properties?: iterm2.ICoord): iterm2.Coord;

        /**
         * Encodes the specified Coord message. Does not implicitly {@link iterm2.Coord.verify|verify} messages.
         * @param message Coord message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICoord, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Coord message, length delimited. Does not implicitly {@link iterm2.Coord.verify|verify} messages.
         * @param message Coord message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICoord, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Coord message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Coord
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Coord;

        /**
         * Decodes a Coord message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Coord
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Coord;

        /**
         * Verifies a Coord message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Coord message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Coord
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Coord;

        /**
         * Creates a plain object from a Coord message. Also converts values to other types if specified.
         * @param message Coord
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Coord, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Coord to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Coord
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** AlternateColor enum. */
    enum AlternateColor {
        DEFAULT = 0,
        REVERSED_DEFAULT = 3,
        SYSTEM_MESSAGE = 4
    }

    /** Properties of a RGBColor. */
    interface IRGBColor {

        /** RGBColor red */
        red?: (number|null);

        /** RGBColor green */
        green?: (number|null);

        /** RGBColor blue */
        blue?: (number|null);
    }

    /** Represents a RGBColor. */
    class RGBColor implements IRGBColor {

        /**
         * Constructs a new RGBColor.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IRGBColor);

        /** RGBColor red. */
        public red: number;

        /** RGBColor green. */
        public green: number;

        /** RGBColor blue. */
        public blue: number;

        /**
         * Creates a new RGBColor instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RGBColor instance
         */
        public static create(properties?: iterm2.IRGBColor): iterm2.RGBColor;

        /**
         * Encodes the specified RGBColor message. Does not implicitly {@link iterm2.RGBColor.verify|verify} messages.
         * @param message RGBColor message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IRGBColor, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RGBColor message, length delimited. Does not implicitly {@link iterm2.RGBColor.verify|verify} messages.
         * @param message RGBColor message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IRGBColor, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RGBColor message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RGBColor
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.RGBColor;

        /**
         * Decodes a RGBColor message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RGBColor
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.RGBColor;

        /**
         * Verifies a RGBColor message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RGBColor message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RGBColor
         */
        public static fromObject(object: { [k: string]: any }): iterm2.RGBColor;

        /**
         * Creates a plain object from a RGBColor message. Also converts values to other types if specified.
         * @param message RGBColor
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.RGBColor, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RGBColor to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RGBColor
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** ImagePlaceholderType enum. */
    enum ImagePlaceholderType {
        NONE = 0,
        ITERM2 = 1,
        KITTY = 2
    }

    /** Properties of a URL. */
    interface IURL {

        /** URL url */
        url?: (string|null);

        /** URL identifier */
        identifier?: (string|null);
    }

    /** Represents a URL. */
    class URL implements IURL {

        /**
         * Constructs a new URL.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IURL);

        /** URL url. */
        public url: string;

        /** URL identifier. */
        public identifier: string;

        /**
         * Creates a new URL instance using the specified properties.
         * @param [properties] Properties to set
         * @returns URL instance
         */
        public static create(properties?: iterm2.IURL): iterm2.URL;

        /**
         * Encodes the specified URL message. Does not implicitly {@link iterm2.URL.verify|verify} messages.
         * @param message URL message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IURL, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified URL message, length delimited. Does not implicitly {@link iterm2.URL.verify|verify} messages.
         * @param message URL message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IURL, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a URL message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns URL
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.URL;

        /**
         * Decodes a URL message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns URL
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.URL;

        /**
         * Verifies a URL message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a URL message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns URL
         */
        public static fromObject(object: { [k: string]: any }): iterm2.URL;

        /**
         * Creates a plain object from a URL message. Also converts values to other types if specified.
         * @param message URL
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.URL, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this URL to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for URL
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CellStyle. */
    interface ICellStyle {

        /** CellStyle fgStandard */
        fgStandard?: (number|null);

        /** CellStyle fgAlternate */
        fgAlternate?: (iterm2.AlternateColor|null);

        /** CellStyle fgRgb */
        fgRgb?: (iterm2.IRGBColor|null);

        /** CellStyle fgAlternatePlacementX */
        fgAlternatePlacementX?: (number|null);

        /** CellStyle bgStandard */
        bgStandard?: (number|null);

        /** CellStyle bgAlternate */
        bgAlternate?: (iterm2.AlternateColor|null);

        /** CellStyle bgRgb */
        bgRgb?: (iterm2.IRGBColor|null);

        /** CellStyle bgAlternatePlacementY */
        bgAlternatePlacementY?: (number|null);

        /** CellStyle bold */
        bold?: (boolean|null);

        /** CellStyle faint */
        faint?: (boolean|null);

        /** CellStyle italic */
        italic?: (boolean|null);

        /** CellStyle blink */
        blink?: (boolean|null);

        /** CellStyle underline */
        underline?: (boolean|null);

        /** CellStyle strikethrough */
        strikethrough?: (boolean|null);

        /** CellStyle invisible */
        invisible?: (boolean|null);

        /** CellStyle inverse */
        inverse?: (boolean|null);

        /** CellStyle guarded */
        guarded?: (boolean|null);

        /** CellStyle image */
        image?: (iterm2.ImagePlaceholderType|null);

        /** CellStyle underlineColor */
        underlineColor?: (iterm2.IRGBColor|null);

        /** CellStyle blockID */
        blockID?: (string|null);

        /** CellStyle url */
        url?: (iterm2.IURL|null);

        /** CellStyle repeats */
        repeats?: (number|null);
    }

    /** Represents a CellStyle. */
    class CellStyle implements ICellStyle {

        /**
         * Constructs a new CellStyle.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICellStyle);

        /** CellStyle fgStandard. */
        public fgStandard?: (number|null);

        /** CellStyle fgAlternate. */
        public fgAlternate?: (iterm2.AlternateColor|null);

        /** CellStyle fgRgb. */
        public fgRgb?: (iterm2.IRGBColor|null);

        /** CellStyle fgAlternatePlacementX. */
        public fgAlternatePlacementX?: (number|null);

        /** CellStyle bgStandard. */
        public bgStandard?: (number|null);

        /** CellStyle bgAlternate. */
        public bgAlternate?: (iterm2.AlternateColor|null);

        /** CellStyle bgRgb. */
        public bgRgb?: (iterm2.IRGBColor|null);

        /** CellStyle bgAlternatePlacementY. */
        public bgAlternatePlacementY?: (number|null);

        /** CellStyle bold. */
        public bold: boolean;

        /** CellStyle faint. */
        public faint: boolean;

        /** CellStyle italic. */
        public italic: boolean;

        /** CellStyle blink. */
        public blink: boolean;

        /** CellStyle underline. */
        public underline: boolean;

        /** CellStyle strikethrough. */
        public strikethrough: boolean;

        /** CellStyle invisible. */
        public invisible: boolean;

        /** CellStyle inverse. */
        public inverse: boolean;

        /** CellStyle guarded. */
        public guarded: boolean;

        /** CellStyle image. */
        public image: iterm2.ImagePlaceholderType;

        /** CellStyle underlineColor. */
        public underlineColor?: (iterm2.IRGBColor|null);

        /** CellStyle blockID. */
        public blockID: string;

        /** CellStyle url. */
        public url?: (iterm2.IURL|null);

        /** CellStyle repeats. */
        public repeats: number;

        /** CellStyle fgColor. */
        public fgColor?: ("fgStandard"|"fgAlternate"|"fgRgb"|"fgAlternatePlacementX");

        /** CellStyle bgColor. */
        public bgColor?: ("bgStandard"|"bgAlternate"|"bgRgb"|"bgAlternatePlacementY");

        /**
         * Creates a new CellStyle instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CellStyle instance
         */
        public static create(properties?: iterm2.ICellStyle): iterm2.CellStyle;

        /**
         * Encodes the specified CellStyle message. Does not implicitly {@link iterm2.CellStyle.verify|verify} messages.
         * @param message CellStyle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICellStyle, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CellStyle message, length delimited. Does not implicitly {@link iterm2.CellStyle.verify|verify} messages.
         * @param message CellStyle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICellStyle, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CellStyle message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CellStyle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CellStyle;

        /**
         * Decodes a CellStyle message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CellStyle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CellStyle;

        /**
         * Verifies a CellStyle message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CellStyle message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CellStyle
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CellStyle;

        /**
         * Creates a plain object from a CellStyle message. Also converts values to other types if specified.
         * @param message CellStyle
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CellStyle, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CellStyle to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CellStyle
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LineContents. */
    interface ILineContents {

        /** LineContents text */
        text?: (string|null);

        /** LineContents codePointsPerCell */
        codePointsPerCell?: (iterm2.ICodePointsPerCell[]|null);

        /** LineContents continuation */
        continuation?: (iterm2.LineContents.Continuation|null);

        /** LineContents style */
        style?: (iterm2.ICellStyle[]|null);
    }

    /** Represents a LineContents. */
    class LineContents implements ILineContents {

        /**
         * Constructs a new LineContents.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ILineContents);

        /** LineContents text. */
        public text: string;

        /** LineContents codePointsPerCell. */
        public codePointsPerCell: iterm2.ICodePointsPerCell[];

        /** LineContents continuation. */
        public continuation: iterm2.LineContents.Continuation;

        /** LineContents style. */
        public style: iterm2.ICellStyle[];

        /**
         * Creates a new LineContents instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LineContents instance
         */
        public static create(properties?: iterm2.ILineContents): iterm2.LineContents;

        /**
         * Encodes the specified LineContents message. Does not implicitly {@link iterm2.LineContents.verify|verify} messages.
         * @param message LineContents message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ILineContents, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LineContents message, length delimited. Does not implicitly {@link iterm2.LineContents.verify|verify} messages.
         * @param message LineContents message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ILineContents, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LineContents message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LineContents
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.LineContents;

        /**
         * Decodes a LineContents message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LineContents
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.LineContents;

        /**
         * Verifies a LineContents message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LineContents message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LineContents
         */
        public static fromObject(object: { [k: string]: any }): iterm2.LineContents;

        /**
         * Creates a plain object from a LineContents message. Also converts values to other types if specified.
         * @param message LineContents
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.LineContents, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LineContents to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LineContents
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace LineContents {

        /** Continuation enum. */
        enum Continuation {
            CONTINUATION_HARD_EOL = 1,
            CONTINUATION_SOFT_EOL = 2
        }
    }

    /** Properties of a CodePointsPerCell. */
    interface ICodePointsPerCell {

        /** CodePointsPerCell numCodePoints */
        numCodePoints?: (number|null);

        /** CodePointsPerCell repeats */
        repeats?: (number|null);
    }

    /** Represents a CodePointsPerCell. */
    class CodePointsPerCell implements ICodePointsPerCell {

        /**
         * Constructs a new CodePointsPerCell.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICodePointsPerCell);

        /** CodePointsPerCell numCodePoints. */
        public numCodePoints: number;

        /** CodePointsPerCell repeats. */
        public repeats: number;

        /**
         * Creates a new CodePointsPerCell instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CodePointsPerCell instance
         */
        public static create(properties?: iterm2.ICodePointsPerCell): iterm2.CodePointsPerCell;

        /**
         * Encodes the specified CodePointsPerCell message. Does not implicitly {@link iterm2.CodePointsPerCell.verify|verify} messages.
         * @param message CodePointsPerCell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICodePointsPerCell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CodePointsPerCell message, length delimited. Does not implicitly {@link iterm2.CodePointsPerCell.verify|verify} messages.
         * @param message CodePointsPerCell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICodePointsPerCell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CodePointsPerCell message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CodePointsPerCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CodePointsPerCell;

        /**
         * Decodes a CodePointsPerCell message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CodePointsPerCell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CodePointsPerCell;

        /**
         * Verifies a CodePointsPerCell message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CodePointsPerCell message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CodePointsPerCell
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CodePointsPerCell;

        /**
         * Creates a plain object from a CodePointsPerCell message. Also converts values to other types if specified.
         * @param message CodePointsPerCell
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CodePointsPerCell, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CodePointsPerCell to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CodePointsPerCell
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListSessionsRequest. */
    interface IListSessionsRequest {
    }

    /** Represents a ListSessionsRequest. */
    class ListSessionsRequest implements IListSessionsRequest {

        /**
         * Constructs a new ListSessionsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListSessionsRequest);

        /**
         * Creates a new ListSessionsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListSessionsRequest instance
         */
        public static create(properties?: iterm2.IListSessionsRequest): iterm2.ListSessionsRequest;

        /**
         * Encodes the specified ListSessionsRequest message. Does not implicitly {@link iterm2.ListSessionsRequest.verify|verify} messages.
         * @param message ListSessionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListSessionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListSessionsRequest message, length delimited. Does not implicitly {@link iterm2.ListSessionsRequest.verify|verify} messages.
         * @param message ListSessionsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListSessionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListSessionsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListSessionsRequest;

        /**
         * Decodes a ListSessionsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListSessionsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListSessionsRequest;

        /**
         * Verifies a ListSessionsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListSessionsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListSessionsRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListSessionsRequest;

        /**
         * Creates a plain object from a ListSessionsRequest message. Also converts values to other types if specified.
         * @param message ListSessionsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListSessionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListSessionsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListSessionsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendTextRequest. */
    interface ISendTextRequest {

        /** SendTextRequest session */
        session?: (string|null);

        /** SendTextRequest text */
        text?: (string|null);

        /** SendTextRequest suppressBroadcast */
        suppressBroadcast?: (boolean|null);
    }

    /** Represents a SendTextRequest. */
    class SendTextRequest implements ISendTextRequest {

        /**
         * Constructs a new SendTextRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISendTextRequest);

        /** SendTextRequest session. */
        public session: string;

        /** SendTextRequest text. */
        public text: string;

        /** SendTextRequest suppressBroadcast. */
        public suppressBroadcast: boolean;

        /**
         * Creates a new SendTextRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendTextRequest instance
         */
        public static create(properties?: iterm2.ISendTextRequest): iterm2.SendTextRequest;

        /**
         * Encodes the specified SendTextRequest message. Does not implicitly {@link iterm2.SendTextRequest.verify|verify} messages.
         * @param message SendTextRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISendTextRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendTextRequest message, length delimited. Does not implicitly {@link iterm2.SendTextRequest.verify|verify} messages.
         * @param message SendTextRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISendTextRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SendTextRequest;

        /**
         * Decodes a SendTextRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendTextRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SendTextRequest;

        /**
         * Verifies a SendTextRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendTextRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendTextRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SendTextRequest;

        /**
         * Creates a plain object from a SendTextRequest message. Also converts values to other types if specified.
         * @param message SendTextRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SendTextRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendTextRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendTextRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SendTextResponse. */
    interface ISendTextResponse {

        /** SendTextResponse status */
        status?: (iterm2.SendTextResponse.Status|null);
    }

    /** Represents a SendTextResponse. */
    class SendTextResponse implements ISendTextResponse {

        /**
         * Constructs a new SendTextResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISendTextResponse);

        /** SendTextResponse status. */
        public status: iterm2.SendTextResponse.Status;

        /**
         * Creates a new SendTextResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendTextResponse instance
         */
        public static create(properties?: iterm2.ISendTextResponse): iterm2.SendTextResponse;

        /**
         * Encodes the specified SendTextResponse message. Does not implicitly {@link iterm2.SendTextResponse.verify|verify} messages.
         * @param message SendTextResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISendTextResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendTextResponse message, length delimited. Does not implicitly {@link iterm2.SendTextResponse.verify|verify} messages.
         * @param message SendTextResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISendTextResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SendTextResponse;

        /**
         * Decodes a SendTextResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SendTextResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SendTextResponse;

        /**
         * Verifies a SendTextResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendTextResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendTextResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SendTextResponse;

        /**
         * Creates a plain object from a SendTextResponse message. Also converts values to other types if specified.
         * @param message SendTextResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SendTextResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendTextResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SendTextResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SendTextResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1
        }
    }

    /** Properties of a Size. */
    interface ISize {

        /** Size width */
        width?: (number|null);

        /** Size height */
        height?: (number|null);
    }

    /** Represents a Size. */
    class Size implements ISize {

        /**
         * Constructs a new Size.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISize);

        /** Size width. */
        public width: number;

        /** Size height. */
        public height: number;

        /**
         * Creates a new Size instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Size instance
         */
        public static create(properties?: iterm2.ISize): iterm2.Size;

        /**
         * Encodes the specified Size message. Does not implicitly {@link iterm2.Size.verify|verify} messages.
         * @param message Size message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISize, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Size message, length delimited. Does not implicitly {@link iterm2.Size.verify|verify} messages.
         * @param message Size message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISize, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Size message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Size
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Size;

        /**
         * Decodes a Size message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Size
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Size;

        /**
         * Verifies a Size message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Size message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Size
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Size;

        /**
         * Creates a plain object from a Size message. Also converts values to other types if specified.
         * @param message Size
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Size, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Size to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Size
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Point. */
    interface IPoint {

        /** Point x */
        x?: (number|null);

        /** Point y */
        y?: (number|null);
    }

    /** Represents a Point. */
    class Point implements IPoint {

        /**
         * Constructs a new Point.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IPoint);

        /** Point x. */
        public x: number;

        /** Point y. */
        public y: number;

        /**
         * Creates a new Point instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Point instance
         */
        public static create(properties?: iterm2.IPoint): iterm2.Point;

        /**
         * Encodes the specified Point message. Does not implicitly {@link iterm2.Point.verify|verify} messages.
         * @param message Point message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IPoint, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Point message, length delimited. Does not implicitly {@link iterm2.Point.verify|verify} messages.
         * @param message Point message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IPoint, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Point message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Point
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Point;

        /**
         * Decodes a Point message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Point
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Point;

        /**
         * Verifies a Point message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Point message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Point
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Point;

        /**
         * Creates a plain object from a Point message. Also converts values to other types if specified.
         * @param message Point
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Point, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Point to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Point
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Frame. */
    interface IFrame {

        /** Frame origin */
        origin?: (iterm2.IPoint|null);

        /** Frame size */
        size?: (iterm2.ISize|null);
    }

    /** Represents a Frame. */
    class Frame implements IFrame {

        /**
         * Constructs a new Frame.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IFrame);

        /** Frame origin. */
        public origin?: (iterm2.IPoint|null);

        /** Frame size. */
        public size?: (iterm2.ISize|null);

        /**
         * Creates a new Frame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Frame instance
         */
        public static create(properties?: iterm2.IFrame): iterm2.Frame;

        /**
         * Encodes the specified Frame message. Does not implicitly {@link iterm2.Frame.verify|verify} messages.
         * @param message Frame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Frame message, length delimited. Does not implicitly {@link iterm2.Frame.verify|verify} messages.
         * @param message Frame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Frame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Frame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.Frame;

        /**
         * Decodes a Frame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Frame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.Frame;

        /**
         * Verifies a Frame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Frame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Frame
         */
        public static fromObject(object: { [k: string]: any }): iterm2.Frame;

        /**
         * Creates a plain object from a Frame message. Also converts values to other types if specified.
         * @param message Frame
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.Frame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Frame to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Frame
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SessionSummary. */
    interface ISessionSummary {

        /** SessionSummary uniqueIdentifier */
        uniqueIdentifier?: (string|null);

        /** SessionSummary frame */
        frame?: (iterm2.IFrame|null);

        /** SessionSummary gridSize */
        gridSize?: (iterm2.ISize|null);

        /** SessionSummary title */
        title?: (string|null);
    }

    /** Represents a SessionSummary. */
    class SessionSummary implements ISessionSummary {

        /**
         * Constructs a new SessionSummary.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISessionSummary);

        /** SessionSummary uniqueIdentifier. */
        public uniqueIdentifier: string;

        /** SessionSummary frame. */
        public frame?: (iterm2.IFrame|null);

        /** SessionSummary gridSize. */
        public gridSize?: (iterm2.ISize|null);

        /** SessionSummary title. */
        public title: string;

        /**
         * Creates a new SessionSummary instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionSummary instance
         */
        public static create(properties?: iterm2.ISessionSummary): iterm2.SessionSummary;

        /**
         * Encodes the specified SessionSummary message. Does not implicitly {@link iterm2.SessionSummary.verify|verify} messages.
         * @param message SessionSummary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISessionSummary, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionSummary message, length delimited. Does not implicitly {@link iterm2.SessionSummary.verify|verify} messages.
         * @param message SessionSummary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISessionSummary, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionSummary message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SessionSummary;

        /**
         * Decodes a SessionSummary message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SessionSummary;

        /**
         * Verifies a SessionSummary message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionSummary message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionSummary
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SessionSummary;

        /**
         * Creates a plain object from a SessionSummary message. Also converts values to other types if specified.
         * @param message SessionSummary
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SessionSummary, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionSummary to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SessionSummary
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SplitTreeNode. */
    interface ISplitTreeNode {

        /** SplitTreeNode vertical */
        vertical?: (boolean|null);

        /** SplitTreeNode links */
        links?: (iterm2.SplitTreeNode.ISplitTreeLink[]|null);
    }

    /** Represents a SplitTreeNode. */
    class SplitTreeNode implements ISplitTreeNode {

        /**
         * Constructs a new SplitTreeNode.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISplitTreeNode);

        /** SplitTreeNode vertical. */
        public vertical: boolean;

        /** SplitTreeNode links. */
        public links: iterm2.SplitTreeNode.ISplitTreeLink[];

        /**
         * Creates a new SplitTreeNode instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SplitTreeNode instance
         */
        public static create(properties?: iterm2.ISplitTreeNode): iterm2.SplitTreeNode;

        /**
         * Encodes the specified SplitTreeNode message. Does not implicitly {@link iterm2.SplitTreeNode.verify|verify} messages.
         * @param message SplitTreeNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISplitTreeNode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SplitTreeNode message, length delimited. Does not implicitly {@link iterm2.SplitTreeNode.verify|verify} messages.
         * @param message SplitTreeNode message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISplitTreeNode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SplitTreeNode message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SplitTreeNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SplitTreeNode;

        /**
         * Decodes a SplitTreeNode message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SplitTreeNode
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SplitTreeNode;

        /**
         * Verifies a SplitTreeNode message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SplitTreeNode message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SplitTreeNode
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SplitTreeNode;

        /**
         * Creates a plain object from a SplitTreeNode message. Also converts values to other types if specified.
         * @param message SplitTreeNode
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SplitTreeNode, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SplitTreeNode to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SplitTreeNode
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SplitTreeNode {

        /** Properties of a SplitTreeLink. */
        interface ISplitTreeLink {

            /** SplitTreeLink session */
            session?: (iterm2.ISessionSummary|null);

            /** SplitTreeLink node */
            node?: (iterm2.ISplitTreeNode|null);
        }

        /** Represents a SplitTreeLink. */
        class SplitTreeLink implements ISplitTreeLink {

            /**
             * Constructs a new SplitTreeLink.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.SplitTreeNode.ISplitTreeLink);

            /** SplitTreeLink session. */
            public session?: (iterm2.ISessionSummary|null);

            /** SplitTreeLink node. */
            public node?: (iterm2.ISplitTreeNode|null);

            /** SplitTreeLink child. */
            public child?: ("session"|"node");

            /**
             * Creates a new SplitTreeLink instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SplitTreeLink instance
             */
            public static create(properties?: iterm2.SplitTreeNode.ISplitTreeLink): iterm2.SplitTreeNode.SplitTreeLink;

            /**
             * Encodes the specified SplitTreeLink message. Does not implicitly {@link iterm2.SplitTreeNode.SplitTreeLink.verify|verify} messages.
             * @param message SplitTreeLink message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.SplitTreeNode.ISplitTreeLink, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SplitTreeLink message, length delimited. Does not implicitly {@link iterm2.SplitTreeNode.SplitTreeLink.verify|verify} messages.
             * @param message SplitTreeLink message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.SplitTreeNode.ISplitTreeLink, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SplitTreeLink message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SplitTreeLink
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SplitTreeNode.SplitTreeLink;

            /**
             * Decodes a SplitTreeLink message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SplitTreeLink
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SplitTreeNode.SplitTreeLink;

            /**
             * Verifies a SplitTreeLink message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SplitTreeLink message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SplitTreeLink
             */
            public static fromObject(object: { [k: string]: any }): iterm2.SplitTreeNode.SplitTreeLink;

            /**
             * Creates a plain object from a SplitTreeLink message. Also converts values to other types if specified.
             * @param message SplitTreeLink
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.SplitTreeNode.SplitTreeLink, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SplitTreeLink to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SplitTreeLink
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a ListSessionsResponse. */
    interface IListSessionsResponse {

        /** ListSessionsResponse windows */
        windows?: (iterm2.ListSessionsResponse.IWindow[]|null);

        /** ListSessionsResponse buriedSessions */
        buriedSessions?: (iterm2.ISessionSummary[]|null);
    }

    /** Represents a ListSessionsResponse. */
    class ListSessionsResponse implements IListSessionsResponse {

        /**
         * Constructs a new ListSessionsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.IListSessionsResponse);

        /** ListSessionsResponse windows. */
        public windows: iterm2.ListSessionsResponse.IWindow[];

        /** ListSessionsResponse buriedSessions. */
        public buriedSessions: iterm2.ISessionSummary[];

        /**
         * Creates a new ListSessionsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListSessionsResponse instance
         */
        public static create(properties?: iterm2.IListSessionsResponse): iterm2.ListSessionsResponse;

        /**
         * Encodes the specified ListSessionsResponse message. Does not implicitly {@link iterm2.ListSessionsResponse.verify|verify} messages.
         * @param message ListSessionsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.IListSessionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListSessionsResponse message, length delimited. Does not implicitly {@link iterm2.ListSessionsResponse.verify|verify} messages.
         * @param message ListSessionsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.IListSessionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListSessionsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListSessionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListSessionsResponse;

        /**
         * Decodes a ListSessionsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListSessionsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListSessionsResponse;

        /**
         * Verifies a ListSessionsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListSessionsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListSessionsResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.ListSessionsResponse;

        /**
         * Creates a plain object from a ListSessionsResponse message. Also converts values to other types if specified.
         * @param message ListSessionsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.ListSessionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListSessionsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListSessionsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ListSessionsResponse {

        /** Properties of a Window. */
        interface IWindow {

            /** Window tabs */
            tabs?: (iterm2.ListSessionsResponse.ITab[]|null);

            /** Window windowId */
            windowId?: (string|null);

            /** Window frame */
            frame?: (iterm2.IFrame|null);

            /** Window number */
            number?: (number|null);
        }

        /** Represents a Window. */
        class Window implements IWindow {

            /**
             * Constructs a new Window.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ListSessionsResponse.IWindow);

            /** Window tabs. */
            public tabs: iterm2.ListSessionsResponse.ITab[];

            /** Window windowId. */
            public windowId: string;

            /** Window frame. */
            public frame?: (iterm2.IFrame|null);

            /** Window number. */
            public number: number;

            /**
             * Creates a new Window instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Window instance
             */
            public static create(properties?: iterm2.ListSessionsResponse.IWindow): iterm2.ListSessionsResponse.Window;

            /**
             * Encodes the specified Window message. Does not implicitly {@link iterm2.ListSessionsResponse.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ListSessionsResponse.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Window message, length delimited. Does not implicitly {@link iterm2.ListSessionsResponse.Window.verify|verify} messages.
             * @param message Window message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ListSessionsResponse.IWindow, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Window message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListSessionsResponse.Window;

            /**
             * Decodes a Window message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Window
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListSessionsResponse.Window;

            /**
             * Verifies a Window message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Window message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Window
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ListSessionsResponse.Window;

            /**
             * Creates a plain object from a Window message. Also converts values to other types if specified.
             * @param message Window
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ListSessionsResponse.Window, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Window to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Window
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Tab. */
        interface ITab {

            /** Tab root */
            root?: (iterm2.ISplitTreeNode|null);

            /** Tab tabId */
            tabId?: (string|null);

            /** Tab tmuxWindowId */
            tmuxWindowId?: (string|null);

            /** Tab tmuxConnectionId */
            tmuxConnectionId?: (string|null);

            /** Tab minimizedSessions */
            minimizedSessions?: (iterm2.ISessionSummary[]|null);
        }

        /** Represents a Tab. */
        class Tab implements ITab {

            /**
             * Constructs a new Tab.
             * @param [properties] Properties to set
             */
            constructor(properties?: iterm2.ListSessionsResponse.ITab);

            /** Tab root. */
            public root?: (iterm2.ISplitTreeNode|null);

            /** Tab tabId. */
            public tabId: string;

            /** Tab tmuxWindowId. */
            public tmuxWindowId: string;

            /** Tab tmuxConnectionId. */
            public tmuxConnectionId: string;

            /** Tab minimizedSessions. */
            public minimizedSessions: iterm2.ISessionSummary[];

            /**
             * Creates a new Tab instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Tab instance
             */
            public static create(properties?: iterm2.ListSessionsResponse.ITab): iterm2.ListSessionsResponse.Tab;

            /**
             * Encodes the specified Tab message. Does not implicitly {@link iterm2.ListSessionsResponse.Tab.verify|verify} messages.
             * @param message Tab message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: iterm2.ListSessionsResponse.ITab, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Tab message, length delimited. Does not implicitly {@link iterm2.ListSessionsResponse.Tab.verify|verify} messages.
             * @param message Tab message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: iterm2.ListSessionsResponse.ITab, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Tab message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Tab
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.ListSessionsResponse.Tab;

            /**
             * Decodes a Tab message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Tab
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.ListSessionsResponse.Tab;

            /**
             * Verifies a Tab message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Tab message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Tab
             */
            public static fromObject(object: { [k: string]: any }): iterm2.ListSessionsResponse.Tab;

            /**
             * Creates a plain object from a Tab message. Also converts values to other types if specified.
             * @param message Tab
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: iterm2.ListSessionsResponse.Tab, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Tab to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Tab
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Properties of a CreateTabRequest. */
    interface ICreateTabRequest {

        /** CreateTabRequest profileName */
        profileName?: (string|null);

        /** CreateTabRequest windowId */
        windowId?: (string|null);

        /** CreateTabRequest tabIndex */
        tabIndex?: (number|null);

        /** CreateTabRequest command */
        command?: (string|null);

        /** CreateTabRequest customProfileProperties */
        customProfileProperties?: (iterm2.IProfileProperty[]|null);
    }

    /** Represents a CreateTabRequest. */
    class CreateTabRequest implements ICreateTabRequest {

        /**
         * Constructs a new CreateTabRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICreateTabRequest);

        /** CreateTabRequest profileName. */
        public profileName: string;

        /** CreateTabRequest windowId. */
        public windowId: string;

        /** CreateTabRequest tabIndex. */
        public tabIndex: number;

        /** CreateTabRequest command. */
        public command: string;

        /** CreateTabRequest customProfileProperties. */
        public customProfileProperties: iterm2.IProfileProperty[];

        /**
         * Creates a new CreateTabRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CreateTabRequest instance
         */
        public static create(properties?: iterm2.ICreateTabRequest): iterm2.CreateTabRequest;

        /**
         * Encodes the specified CreateTabRequest message. Does not implicitly {@link iterm2.CreateTabRequest.verify|verify} messages.
         * @param message CreateTabRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICreateTabRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CreateTabRequest message, length delimited. Does not implicitly {@link iterm2.CreateTabRequest.verify|verify} messages.
         * @param message CreateTabRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICreateTabRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CreateTabRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CreateTabRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CreateTabRequest;

        /**
         * Decodes a CreateTabRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CreateTabRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CreateTabRequest;

        /**
         * Verifies a CreateTabRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CreateTabRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CreateTabRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CreateTabRequest;

        /**
         * Creates a plain object from a CreateTabRequest message. Also converts values to other types if specified.
         * @param message CreateTabRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CreateTabRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CreateTabRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CreateTabRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CreateTabResponse. */
    interface ICreateTabResponse {

        /** CreateTabResponse status */
        status?: (iterm2.CreateTabResponse.Status|null);

        /** CreateTabResponse windowId */
        windowId?: (string|null);

        /** CreateTabResponse tabId */
        tabId?: (number|null);

        /** CreateTabResponse sessionId */
        sessionId?: (string|null);
    }

    /** Represents a CreateTabResponse. */
    class CreateTabResponse implements ICreateTabResponse {

        /**
         * Constructs a new CreateTabResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ICreateTabResponse);

        /** CreateTabResponse status. */
        public status: iterm2.CreateTabResponse.Status;

        /** CreateTabResponse windowId. */
        public windowId: string;

        /** CreateTabResponse tabId. */
        public tabId: number;

        /** CreateTabResponse sessionId. */
        public sessionId: string;

        /**
         * Creates a new CreateTabResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CreateTabResponse instance
         */
        public static create(properties?: iterm2.ICreateTabResponse): iterm2.CreateTabResponse;

        /**
         * Encodes the specified CreateTabResponse message. Does not implicitly {@link iterm2.CreateTabResponse.verify|verify} messages.
         * @param message CreateTabResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ICreateTabResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CreateTabResponse message, length delimited. Does not implicitly {@link iterm2.CreateTabResponse.verify|verify} messages.
         * @param message CreateTabResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ICreateTabResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CreateTabResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CreateTabResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.CreateTabResponse;

        /**
         * Decodes a CreateTabResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CreateTabResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.CreateTabResponse;

        /**
         * Verifies a CreateTabResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CreateTabResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CreateTabResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.CreateTabResponse;

        /**
         * Creates a plain object from a CreateTabResponse message. Also converts values to other types if specified.
         * @param message CreateTabResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.CreateTabResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CreateTabResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CreateTabResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace CreateTabResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            INVALID_PROFILE_NAME = 1,
            INVALID_WINDOW_ID = 2,
            INVALID_TAB_INDEX = 3,
            MISSING_SUBSTITUTION = 4
        }
    }

    /** Properties of a SplitPaneRequest. */
    interface ISplitPaneRequest {

        /** SplitPaneRequest session */
        session?: (string|null);

        /** SplitPaneRequest splitDirection */
        splitDirection?: (iterm2.SplitPaneRequest.SplitDirection|null);

        /** SplitPaneRequest before */
        before?: (boolean|null);

        /** SplitPaneRequest profileName */
        profileName?: (string|null);

        /** SplitPaneRequest customProfileProperties */
        customProfileProperties?: (iterm2.IProfileProperty[]|null);
    }

    /** Represents a SplitPaneRequest. */
    class SplitPaneRequest implements ISplitPaneRequest {

        /**
         * Constructs a new SplitPaneRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISplitPaneRequest);

        /** SplitPaneRequest session. */
        public session: string;

        /** SplitPaneRequest splitDirection. */
        public splitDirection: iterm2.SplitPaneRequest.SplitDirection;

        /** SplitPaneRequest before. */
        public before: boolean;

        /** SplitPaneRequest profileName. */
        public profileName: string;

        /** SplitPaneRequest customProfileProperties. */
        public customProfileProperties: iterm2.IProfileProperty[];

        /**
         * Creates a new SplitPaneRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SplitPaneRequest instance
         */
        public static create(properties?: iterm2.ISplitPaneRequest): iterm2.SplitPaneRequest;

        /**
         * Encodes the specified SplitPaneRequest message. Does not implicitly {@link iterm2.SplitPaneRequest.verify|verify} messages.
         * @param message SplitPaneRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISplitPaneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SplitPaneRequest message, length delimited. Does not implicitly {@link iterm2.SplitPaneRequest.verify|verify} messages.
         * @param message SplitPaneRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISplitPaneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SplitPaneRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SplitPaneRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SplitPaneRequest;

        /**
         * Decodes a SplitPaneRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SplitPaneRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SplitPaneRequest;

        /**
         * Verifies a SplitPaneRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SplitPaneRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SplitPaneRequest
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SplitPaneRequest;

        /**
         * Creates a plain object from a SplitPaneRequest message. Also converts values to other types if specified.
         * @param message SplitPaneRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SplitPaneRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SplitPaneRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SplitPaneRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SplitPaneRequest {

        /** SplitDirection enum. */
        enum SplitDirection {
            VERTICAL = 0,
            HORIZONTAL = 1
        }
    }

    /** Properties of a SplitPaneResponse. */
    interface ISplitPaneResponse {

        /** SplitPaneResponse status */
        status?: (iterm2.SplitPaneResponse.Status|null);

        /** SplitPaneResponse sessionId */
        sessionId?: (string[]|null);
    }

    /** Represents a SplitPaneResponse. */
    class SplitPaneResponse implements ISplitPaneResponse {

        /**
         * Constructs a new SplitPaneResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: iterm2.ISplitPaneResponse);

        /** SplitPaneResponse status. */
        public status: iterm2.SplitPaneResponse.Status;

        /** SplitPaneResponse sessionId. */
        public sessionId: string[];

        /**
         * Creates a new SplitPaneResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SplitPaneResponse instance
         */
        public static create(properties?: iterm2.ISplitPaneResponse): iterm2.SplitPaneResponse;

        /**
         * Encodes the specified SplitPaneResponse message. Does not implicitly {@link iterm2.SplitPaneResponse.verify|verify} messages.
         * @param message SplitPaneResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: iterm2.ISplitPaneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SplitPaneResponse message, length delimited. Does not implicitly {@link iterm2.SplitPaneResponse.verify|verify} messages.
         * @param message SplitPaneResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: iterm2.ISplitPaneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SplitPaneResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SplitPaneResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): iterm2.SplitPaneResponse;

        /**
         * Decodes a SplitPaneResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SplitPaneResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): iterm2.SplitPaneResponse;

        /**
         * Verifies a SplitPaneResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SplitPaneResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SplitPaneResponse
         */
        public static fromObject(object: { [k: string]: any }): iterm2.SplitPaneResponse;

        /**
         * Creates a plain object from a SplitPaneResponse message. Also converts values to other types if specified.
         * @param message SplitPaneResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: iterm2.SplitPaneResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SplitPaneResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SplitPaneResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SplitPaneResponse {

        /** Status enum. */
        enum Status {
            OK = 0,
            SESSION_NOT_FOUND = 1,
            INVALID_PROFILE_NAME = 2,
            CANNOT_SPLIT = 3,
            MALFORMED_CUSTOM_PROFILE_PROPERTY = 4
        }
    }
}
