package com.java5.asm.service.impl;

import com.java5.asm.dto.enumclass.FriendshipStatus;
import com.java5.asm.entity.Friendship;
import com.java5.asm.entity.User;
import com.java5.asm.exception.ApiException;
import com.java5.asm.repository.FriendshipRepository;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.FriendshipService;
import com.java5.asm.service.ws.FriendRawWsPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FriendshipServiceImpl implements FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final FriendRawWsPublisher friendRawWsPublisher;

    @Override
    public boolean isBlocked(UUID a, UUID b) {
        return friendshipRepository.findBetweenUsers(a, b)
                .map(f -> f.getStatus() == FriendshipStatus.BLOCKED)
                .orElse(false);
    }

    @Override
    @Transactional
    public void unfriend(UUID targetUserId) {
        UUID me = requireMeId();

        friendshipRepository.findByRequester_IdAndAddressee_Id(me, targetUserId)
                .ifPresent(friendshipRepository::delete);

        friendshipRepository.findByRequester_IdAndAddressee_Id(targetUserId, me)
                .ifPresent(friendshipRepository::delete);

        pushBoth("UNFRIEND", me, targetUserId, "NONE", "NONE");
    }

    @Override
    public boolean isFriend(UUID a, UUID b) {
        return friendshipRepository.findBetweenUsers(a, b)
                .map(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                .orElse(false);
    }

    /**
     * @return
     */
    @Override
    public UUID requireMeId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized");

        }
        return UUID.fromString(auth.getName());
    }

    /**
     * @param id
     * @return
     */
    @Override
    public User requireUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /**
     * @param targetUserId
     */
    @Override
    @Transactional
    public void request(UUID targetUserId) {
        UUID me = requireMeId();
        if (me.equals(targetUserId))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể tự kết bạn.");

        // tìm record 2 chiều
        var opt = friendshipRepository.findByRequester_IdAndAddressee_IdOrRequester_IdAndAddressee_Id(
                me, targetUserId,
                targetUserId, me
        );

        if (opt.isEmpty()) {
            Friendship fr = new Friendship();
            fr.setRequester(requireUser(me));
            fr.setAddressee(requireUser(targetUserId));
            fr.setStatus(FriendshipStatus.PENDING);
            friendshipRepository.save(fr);

            // WS: A thấy PENDING_OUT, B thấy PENDING_IN
            pushBoth("REQUEST", me, targetUserId, "PENDING_OUT", "PENDING_IN");
            return;
        }

        Friendship existing = opt.get();

        if (existing.getStatus() == FriendshipStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không thể kết bạn (đang bị chặn).");
        }

        // đã là bạn
        if (existing.getStatus() == FriendshipStatus.ACCEPTED) {
            pushBoth("ALREADY_FRIEND", me, targetUserId, "FRIEND", "FRIEND");
            return;
        }

        // đang pending
        if (existing.getStatus() == FriendshipStatus.PENDING) {
            // nếu mình là requester -> idempotent
            if (existing.getRequester().getId().equals(me)) {
                pushBoth("REQUEST", me, targetUserId, "PENDING_OUT", "PENDING_IN");
                return;
            }
            // ngược lại: người kia đã gửi mình -> auto accept
            existing.setStatus(FriendshipStatus.ACCEPTED);
            friendshipRepository.save(existing);
            pushBoth("ACCEPT", me, targetUserId, "FRIEND", "FRIEND");
        }
    }

    /**
     * @param targetUserId
     */
    @Override
    @Transactional
    public void cancel(UUID targetUserId) {
        UUID me = requireMeId();

        // cancel chỉ áp dụng nếu mình là requester
        var frOpt = friendshipRepository.findByRequester_IdAndAddressee_Id(me, targetUserId);
        if (frOpt.isEmpty()) {
            // idempotent: không có thì thôi, vẫn push để FE sync về NONE (tuỳ bạn)
            pushBoth("CANCEL", me, targetUserId, "NONE", "NONE");
            return;
        }

        Friendship fr = frOpt.get();
        if (fr.getStatus() != FriendshipStatus.PENDING) {
            // không pending thì thôi (idempotent)
            pushBoth("CANCEL_INVALID", me, targetUserId, getUiStatus(me, targetUserId), getUiStatus(targetUserId, me));
            return;
        }

        friendshipRepository.delete(fr);

        pushBoth("CANCEL", me, targetUserId, "NONE", "NONE");
    }

    /**
     * @param requesterId
     */
    @Override
    @Transactional
    public void accept(UUID requesterId) {
        UUID me = requireMeId();
        if (me.equals(requesterId))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid requester.");

        Friendship fr = friendshipRepository.findByRequester_IdAndAddressee_Id(requesterId, me)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lời mời kết bạn."));

        if (fr.getStatus() == FriendshipStatus.BLOCKED)
            throw new ApiException(HttpStatus.FORBIDDEN, "Không thể chấp nhận (đang bị chặn).");

        if (fr.getStatus() == FriendshipStatus.ACCEPTED) {
            pushBoth("ACCEPT", me, requesterId, "FRIEND", "FRIEND");
            return;
        }

        if (fr.getStatus() != FriendshipStatus.PENDING)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ để chấp nhận.");

        fr.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(fr);

        // me là addressee, requester là actor bên kia -> nhưng UI cả 2 đều FRIEND
        pushBoth("ACCEPT", me, requesterId, "FRIEND", "FRIEND");
    }

    /**
     * @param me
     * @param other
     * @return
     */
    @Override
    public String getUiStatus(UUID me, UUID other) {
        var frOpt = friendshipRepository.findByRequester_IdAndAddressee_IdOrRequester_IdAndAddressee_Id(me, other, other, me);
        if (frOpt.isEmpty()) return "NONE";
        var fr = frOpt.get();
        return switch (fr.getStatus()) {
            case ACCEPTED -> "FRIEND";
            case BLOCKED -> "BLOCKED";
            case PENDING -> fr.getRequester().getId().equals(me) ? "PENDING_OUT" : "PENDING_IN";
        };
    }


    private void pushBoth(String eventType, UUID actor, UUID target, String uiForActor, String uiForTarget) {
        Runnable task = () -> {
            try {
                friendRawWsPublisher.push(actor, FriendRawWsPublisher.event(eventType, actor, target, uiForActor));
                friendRawWsPublisher.push(target, FriendRawWsPublisher.event(eventType, actor, target, uiForTarget));
            } catch (Exception ignored) {
            }
        };

        // Nếu đang trong transaction -> đợi COMMIT xong mới push
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}

/**
 * @param targetUserId
 */







