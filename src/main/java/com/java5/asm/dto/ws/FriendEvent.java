package com.java5.asm.dto.ws;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FriendEvent {
    private String type;            // FRIEND_REQUESTED | FRIEND_CANCELED | FRIEND_ACCEPTED | FRIEND_UNFRIENDED | FRIEND_BLOCKED
    private UUID actorId;           // người thao tác
    private UUID targetId;          // người bị tác động
    private String actorName;       // optional
    private String statusForTarget; // PENDING_IN / FRIEND / NONE / BLOCKED ...
    private String statusForActor;  // PENDING_OUT / FRIEND / NONE / BLOCKED ...
    private OffsetDateTime ts;
}